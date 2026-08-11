import { randomUUID } from "crypto";
import { signOAuthState, verifyOAuthState } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  RecruiterCalendarConnection,
  User,
} from "@starter-kit/shared/db";
import { Op } from "sequelize";
import {
  exchangeCalendarAuthorizationCode,
  fetchGoogleEmail,
  googleCalendarAuthorizeUrl,
  googleCalendarClient,
  googleCalendarCredentials,
  refreshGoogleAccessToken,
} from "../lib/google-calendar.client";
import {
  decryptSecret,
  encryptSecret,
  isSecretEncryptionConfigured,
} from "../lib/secret-encryption";
import { createError } from "../middleware/error-handler";

type CalendarApplication = Application & {
  job?: Job;
  candidateProfile?: CandidateProfile & { user?: User };
};

export type CalendarOAuthErrorCode =
  | "not_configured"
  | "access_denied"
  | "invalid_state"
  | "missing_code"
  | "provider_error";

export class CalendarOAuthError extends Error {
  readonly code: CalendarOAuthErrorCode;

  constructor(code: CalendarOAuthErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "CalendarOAuthError";
    this.code = code;
  }
}

function calendarConfigured(): boolean {
  return Boolean(googleCalendarCredentials()) && isSecretEncryptionConfigured();
}

async function loadCalendarApplication(
  applicationId: string,
): Promise<CalendarApplication | null> {
  return Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: "job",
        attributes: ["id", "title", "status", "companyId"],
        required: true,
      },
      {
        model: CandidateProfile,
        as: "candidateProfile",
        attributes: ["id"],
        required: true,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
            required: true,
          },
        ],
      },
    ],
  }) as Promise<CalendarApplication | null>;
}

export class CalendarService {
  buildConnectRequest(recruiterId: string): {
    url: string;
    stateToken: string;
  } {
    if (!calendarConfigured()) {
      throw new CalendarOAuthError(
        "not_configured",
        "Google credentials or calendar token encryption key are missing",
      );
    }

    const nonce = randomUUID();
    const stateToken = signOAuthState({
      nonce,
      provider: "google",
      purpose: "calendar",
      userId: recruiterId,
    });

    return { url: googleCalendarAuthorizeUrl(nonce), stateToken };
  }

  async completeConnect(input: {
    code?: string;
    stateParam?: string;
    stateCookie?: string;
    error?: string;
  }): Promise<void> {
    if (input.error) {
      throw new CalendarOAuthError(
        input.error === "access_denied" ? "access_denied" : "provider_error",
        input.error,
      );
    }

    if (!input.stateCookie || !input.stateParam) {
      throw new CalendarOAuthError("invalid_state", "Missing OAuth state");
    }
    const state = verifyOAuthState(input.stateCookie);
    if (
      !state ||
      state.provider !== "google" ||
      state.purpose !== "calendar" ||
      !state.userId ||
      state.nonce !== input.stateParam
    ) {
      throw new CalendarOAuthError("invalid_state", "Invalid OAuth state");
    }
    if (!input.code) {
      throw new CalendarOAuthError("missing_code", "Missing authorization code");
    }
    if (!calendarConfigured()) {
      throw new CalendarOAuthError("not_configured");
    }

    try {
      const recruiter = await User.findOne({
        where: {
          id: state.userId,
          role: { [Op.in]: ["RECRUITER", "ADMIN"] },
        },
      });
      if (!recruiter?.companyId) {
        throw new CalendarOAuthError(
          "invalid_state",
          "Recruiter account is no longer eligible",
        );
      }

      const tokens = await exchangeCalendarAuthorizationCode(input.code);
      const googleEmail = await fetchGoogleEmail(tokens.accessToken);
      await RecruiterCalendarConnection.upsert({
        recruiterId: recruiter.id,
        googleRefreshToken: encryptSecret(tokens.refreshToken),
        googleEmail,
        connectedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof CalendarOAuthError) {
        throw error;
      }
      throw new CalendarOAuthError(
        "provider_error",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async connectionStatus(recruiterId: string) {
    const connection = await RecruiterCalendarConnection.findByPk(recruiterId, {
      attributes: ["googleEmail", "connectedAt"],
    });
    return {
      configured: calendarConfigured(),
      connected: Boolean(connection),
      googleEmail: connection?.googleEmail ?? null,
      connectedAt: connection?.connectedAt ?? null,
    };
  }

  async disconnect(recruiterId: string): Promise<void> {
    await RecruiterCalendarConnection.destroy({ where: { recruiterId } });
  }

  /**
   * Synchronizes only after the interview write commits. Every provider error
   * is converted into application state, so scheduling itself remains valid.
   */
  async synchronizeInterview(
    applicationId: string,
    actorRecruiterId?: string,
  ): Promise<void> {
    try {
      await this.runSynchronization(applicationId, actorRecruiterId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (process.env.NODE_ENV !== "test") {
        console.error(`[calendar] sync for application ${applicationId} failed: ${detail}`);
      }
      try {
        await Application.update(
          { calendarSyncStatus: "failed" },
          { where: { id: applicationId } },
        );
      } catch {
        // The interview date has already committed; a secondary status write
        // must not turn that successful scheduling request into an error.
      }
    }
  }

  private async runSynchronization(
    applicationId: string,
    actorRecruiterId?: string,
  ): Promise<void> {
    const application = await loadCalendarApplication(applicationId);
    if (!application) {
      return;
    }

    const shouldCancel =
      !application.interviewDate ||
      application.stage === "REJECTED" ||
      application.job?.status === "CLOSED";

    if (shouldCancel) {
      if (!application.googleEventId) {
        await application.update({
          googleMeetLink: null,
          calendarSyncStatus: application.interviewDate ? "not_synced" : null,
          calendarSyncRecruiterId: null,
        });
        return;
      }

      const ownerId = application.calendarSyncRecruiterId;
      if (!ownerId) {
        throw new Error("Calendar event owner is unavailable");
      }
      const connection = await RecruiterCalendarConnection.findByPk(ownerId);
      if (!connection) {
        throw new Error("Calendar connection is unavailable");
      }
      const accessToken = await refreshGoogleAccessToken(
        decryptSecret(connection.googleRefreshToken),
      );
      await googleCalendarClient.deleteEvent(
        accessToken,
        application.googleEventId,
      );
      await application.update({
        googleEventId: null,
        googleMeetLink: null,
        calendarSyncStatus: application.interviewDate ? "not_synced" : null,
        calendarSyncRecruiterId: null,
      });
      return;
    }

    const ownerId =
      application.googleEventId && application.calendarSyncRecruiterId
        ? application.calendarSyncRecruiterId
        : actorRecruiterId;
    if (!ownerId) {
      await application.update({ calendarSyncStatus: "not_synced" });
      return;
    }
    const connection = await RecruiterCalendarConnection.findByPk(ownerId);
    if (!connection) {
      await application.update({
        calendarSyncStatus: application.googleEventId ? "failed" : "not_synced",
      });
      return;
    }

    const candidate = application.candidateProfile?.user;
    const job = application.job;
    if (!candidate || !job || !application.interviewDate) {
      throw new Error("Interview calendar data is incomplete");
    }
    const accessToken = await refreshGoogleAccessToken(
      decryptSecret(connection.googleRefreshToken),
    );
    const eventInput = {
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      jobTitle: job.title,
      interviewDate: application.interviewDate,
    };
    const event = application.googleEventId
      ? await googleCalendarClient.updateEvent(
          accessToken,
          application.googleEventId,
          eventInput,
        )
      : await googleCalendarClient.createEvent(accessToken, eventInput);

    await application.update({
      googleEventId: event.eventId,
      googleMeetLink: event.meetLink,
      calendarSyncStatus: event.meetLink ? "synced" : "failed",
      calendarSyncRecruiterId: ownerId,
    });
  }

  async cancelForClosedJob(jobId: string): Promise<void> {
    const applications = await Application.findAll({
      attributes: ["id"],
      where: {
        jobId,
        googleEventId: { [Op.ne]: null },
      },
    });
    await Promise.all(
      applications.map((application) =>
        this.synchronizeInterview(application.id),
      ),
    );
  }

  async listCompanyInterviews(companyId: string) {
    const applications = (await Application.findAll({
      attributes: [
        "id",
        "interviewDate",
        "googleMeetLink",
        "calendarSyncStatus",
      ],
      where: {
        interviewDate: { [Op.gte]: new Date() },
        stage: { [Op.notIn]: ["DRAFT", "REJECTED"] },
      },
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title", "status", "companyId"],
          where: { companyId, status: { [Op.ne]: "CLOSED" } },
          required: true,
        },
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id"],
          required: true,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
              required: true,
            },
          ],
        },
      ],
      order: [["interviewDate", "ASC"]],
    })) as CalendarApplication[];

    return applications.map((application) => ({
      applicationId: application.id,
      interviewDate: application.interviewDate,
      googleMeetLink: application.googleMeetLink ?? null,
      calendarSyncStatus: application.calendarSyncStatus ?? "not_synced",
      job: {
        id: application.job!.id,
        title: application.job!.title,
      },
      candidate: {
        id: application.candidateProfile!.id,
        name: application.candidateProfile!.user!.name,
        email: application.candidateProfile!.user!.email,
      },
    }));
  }

  async requireCompanyId(recruiterId: string): Promise<string> {
    const recruiter = await User.findByPk(recruiterId, {
      attributes: ["companyId"],
      include: [{ model: Company, as: "company", attributes: ["id"] }],
    });
    if (!recruiter?.companyId) {
      throw createError("You must belong to a company", 403);
    }
    return recruiter.companyId;
  }
}

export const calendarService = new CalendarService();
