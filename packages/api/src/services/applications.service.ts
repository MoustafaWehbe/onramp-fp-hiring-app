import {
  Application,
  CandidateProfile,
  Company,
  InterviewAssignment,
  Job,
  User,
} from "@starter-kit/shared/db";
import type { ApplicationStage } from "@starter-kit/shared/db";
import { Op, UniqueConstraintError } from "sequelize";
import { createError } from "../middleware/error-handler";
import {
  applicationResumeService,
  resumeContentType,
  type StoredApplicationResume,
} from "./application-resume.service";
import { scheduleApplicationFitScore } from "./application-scoring-queue.service";
import { notificationService } from "./notifications.service";

/**
 * Notifications and realtime pushes are a side channel on data that is
 * already committed. They must never fail, slow, or roll back the request
 * that triggered them, so every emission is fire-and-forget with its own
 * error boundary.
 */
function emit(work: Promise<void>, context: string): void {
  void work.catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[notifications] ${context} failed: ${detail}`);
  });
}

interface ResumeRequester {
  userId: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" | "INTERVIEWER";
  companyId?: string | null;
}

type ResumeAccessApplication = Application & {
  candidateProfile?: CandidateProfile;
  job?: Job;
};

export class ApplicationService {
  private resumeAttributes(resume: StoredApplicationResume) {
    return {
      resumeFileUrl: resume.storageKey,
      resumeOriginalFilename: resume.originalFilename,
      resumeText: resume.text,
      parsedYearsExperience: resume.yearsExperience,
      parsedSkills: resume.skills,
      resumeUploadedAt: resume.uploadedAt,
    };
  }

  /**
   * AI scoring, interview scheduling, and recruiter notes are internal hiring
   * context, so they are stripped unless the caller is on a recruiter-scoped
   * endpoint.
   */
  private serialize(application: Application, forRecruiter = false) {
    const plain = application.toJSON() as unknown as Record<string, unknown>;
    const {
      aiGaps,
      aiScoredAt,
      aiScoringStatus,
      aiStrengths,
      aiSummary,
      fitScore,
      interviewDate,
      interviewScheduledAt,
      recruiterNotes,
      resumeFileUrl,
      resumeText,
      ...safeApplication
    } = plain;

    return {
      ...safeApplication,
      resumeDownloadUrl:
        typeof resumeFileUrl === "string"
          ? `/api/applications/${application.id}/resume`
          : null,
      resumeParseSucceeded:
        typeof resumeFileUrl === "string" ? Boolean(resumeText) : null,
      ...(forRecruiter
        ? {
            fitScore: fitScore ?? null,
            aiSummary: aiSummary ?? null,
            aiStrengths: aiStrengths ?? [],
            aiGaps: aiGaps ?? [],
            aiScoredAt: aiScoredAt ?? null,
            aiScoringStatus: aiScoringStatus ?? "failed",
            interviewDate: interviewDate ?? null,
            recruiterNotes: recruiterNotes ?? null,
            interviewScheduledAt: interviewScheduledAt ?? null,
          }
        : {}),
    };
  }

  /**
   * Absent keys mean "leave unchanged"; an explicit null means "clear". That
   * distinction is what lets a recruiter edit notes without touching a
   * scheduled date, and clear a date without wiping their notes.
   */
  private interviewAttributes(
    application: Application,
    input: {
      interviewDate?: string | null;
      recruiterNotes?: string | null;
    },
  ) {
    const attributes: {
      interviewDate?: Date | null;
      recruiterNotes?: string | null;
      interviewScheduledAt?: Date | null;
    } = {};

    if (input.interviewDate !== undefined) {
      attributes.interviewDate = input.interviewDate
        ? new Date(input.interviewDate)
        : null;

      // Stamped the first time a date exists and never rewritten, so a
      // reschedule or a clear still shows when scheduling first happened.
      if (attributes.interviewDate && !application.interviewScheduledAt) {
        attributes.interviewScheduledAt = new Date();
      }
    }

    if (input.recruiterNotes !== undefined) {
      // Whitespace-only text is "no notes", stored as null rather than "".
      attributes.recruiterNotes = input.recruiterNotes?.trim()
        ? input.recruiterNotes
        : null;
    }

    return attributes;
  }

  private pendingScoringAttributes() {
    return {
      fitScore: null,
      aiSummary: null,
      aiStrengths: null,
      aiGaps: null,
      aiScoredAt: null,
      aiScoringStatus: "pending" as const,
    };
  }

  async create(
    input: {
      jobId: string;
      candidateProfileId: string;
      coverLetter?: string;
    },
    file?: Express.Multer.File,
  ) {
    const job = await Job.findOne({
      where: {
        id: input.jobId,
        status: "OPEN",
      },
    });

    if (!job) {
      throw createError("Job not found", 404);
    }

    const profile = await CandidateProfile.findByPk(
      input.candidateProfileId,
    );

    if (!profile) {
      throw createError(
        "Candidate profile not found",
        404,
      );
    }

    const existing = await Application.findOne({
      where: {
        jobId: input.jobId,
        candidateProfileId: input.candidateProfileId,
      },
    });

    if (existing?.stage === "DRAFT") {
      const storedResume = file
        ? await applicationResumeService.storeAndParse(profile.userId, file)
        : undefined;
      const previousStorageKey = existing.resumeFileUrl;

      try {
        const [updatedCount] = await Application.update(
          {
            stage: "APPLIED",
            coverLetter: input.coverLetter ?? existing.coverLetter,
            submittedAt: new Date(),
            resumeUrl: existing.resumeUrl ?? profile.resumeUrl,
            ...this.pendingScoringAttributes(),
            ...(storedResume ? this.resumeAttributes(storedResume) : {}),
          },
          {
            where: {
              id: existing.id,
              stage: "DRAFT",
            },
          },
        );

        if (updatedCount === 0) {
          throw createError(
            "You have already applied for this job",
            409,
          );
        }

        await existing.reload();
      } catch (error) {
        if (storedResume) {
          await applicationResumeService.delete(storedResume.storageKey);
        }
        throw error;
      }

      if (
        storedResume &&
        previousStorageKey &&
        previousStorageKey !== storedResume.storageKey
      ) {
        await applicationResumeService.delete(previousStorageKey);
      }

      scheduleApplicationFitScore(existing);
      emit(
        notificationService.recordNewApplication(existing.id),
        `new application ${existing.id}`,
      );

      return {
        application: this.serialize(existing),
        created: false,
      };
    }

    if (existing) {
      throw createError(
        "You have already applied for this job",
        409,
      );
    }

    const storedResume = file
      ? await applicationResumeService.storeAndParse(profile.userId, file)
      : undefined;

    try {
      const application = await Application.create({
        ...input,
        stage: "APPLIED",
        submittedAt: new Date(),
        resumeUrl: profile.resumeUrl,
        ...this.pendingScoringAttributes(),
        ...(storedResume ? this.resumeAttributes(storedResume) : {}),
      });

      scheduleApplicationFitScore(application);
      emit(
        notificationService.recordNewApplication(application.id),
        `new application ${application.id}`,
      );

      return {
        application: this.serialize(application),
        created: true,
      };
    } catch (err) {
      if (storedResume) {
        await applicationResumeService.delete(storedResume.storageKey);
      }

      // The unique index is the final authority under concurrent requests.
      if (err instanceof UniqueConstraintError) {
        throw createError(
          "You have already applied for this job",
          409,
        );
      }

      throw err;
    }
  }

  async getMine(candidateProfileId: string) {
    const applications = await Application.findAll({
      attributes: [
        "id",
        "jobId",
        "stage",
        "coverLetter",
        "resumeUrl",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeText",
        "parsedYearsExperience",
        "parsedSkills",
        "resumeUploadedAt",
        "submittedAt",
        "createdAt",
        "updatedAt",
      ],
      where: { candidateProfileId },
      include: [
        {
          model: Job,
          as: "job",
          attributes: [
            "id",
            "title",
            "description",
            "location",
            "status",
            "createdAt",
          ],
          required: true,
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name", "website", "logoUrl"],
              required: true,
            },
          ],
        },
      ],
      order: [
        ["updatedAt", "DESC"],
        ["createdAt", "DESC"],
        ["id", "ASC"],
      ],
    });

    return applications.map((application) => this.serialize(application));
  }

  async getByJob(jobId: string) {
    const applications = await Application.findAll({
      attributes: [
        "id",
        "jobId",
        "candidateProfileId",
        "stage",
        "coverLetter",
        "resumeUrl",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeText",
        "parsedYearsExperience",
        "parsedSkills",
        "resumeUploadedAt",
        "fitScore",
        "aiSummary",
        "aiStrengths",
        "aiGaps",
        "aiScoredAt",
        "aiScoringStatus",
        "interviewDate",
        "recruiterNotes",
        "interviewScheduledAt",
        "submittedAt",
        "createdAt",
        "updatedAt",
      ],
      where: {
        jobId,
        stage: { [Op.ne]: "DRAFT" },
      },
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          include: [
            {
              model: User,
              as: "user",
              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],
        },
      ],
    });

    return applications.sort((left, right) => {
      const leftScore = left.fitScore ?? -1;
      const rightScore = right.fitScore ?? -1;

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      const leftSubmittedAt = left.submittedAt
        ? left.submittedAt.getTime()
        : 0;
      const rightSubmittedAt = right.submittedAt
        ? right.submittedAt.getTime()
        : 0;
      return rightSubmittedAt - leftSubmittedAt;
    }).map((application) => this.serialize(application, true));
  }

  async replaceResume(
    applicationId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const application = await Application.findByPk(applicationId, {
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
        },
      ],
    }) as ResumeAccessApplication | null;

    if (!application) {
      throw createError("Application not found", 404);
    }

    if (application.candidateProfile?.userId !== userId) {
      throw createError("You cannot replace this application's CV", 403);
    }

    const storedResume = await applicationResumeService.storeAndParse(
      userId,
      file,
    );
    const previousStorageKey = application.resumeFileUrl;

    try {
      await application.update({
        ...this.resumeAttributes(storedResume),
        ...this.pendingScoringAttributes(),
      });
    } catch (error) {
      await applicationResumeService.delete(storedResume.storageKey);
      throw error;
    }

    if (
      previousStorageKey &&
      previousStorageKey !== storedResume.storageKey
    ) {
      await applicationResumeService.delete(previousStorageKey);
    }

    if (application.stage !== "DRAFT") {
      scheduleApplicationFitScore(application);
    }

    return this.serialize(application);
  }

  async rescore(application: Application) {
    if (application.aiScoringStatus === "pending") {
      throw createError("Application scoring is already pending", 409);
    }

    await application.update(this.pendingScoringAttributes());
    scheduleApplicationFitScore(application);
    const pending = await Application.findByPk(application.id);

    if (!pending) {
      throw createError("Application not found", 404);
    }

    // Flips every open pipeline to the "Scoring" state immediately; the
    // worker publishes again when the score lands.
    emit(
      notificationService.broadcastApplicationChange(pending.id),
      `rescore on application ${pending.id}`,
    );

    return this.serialize(pending, true);
  }

  async getResume(applicationId: string, requester: ResumeRequester) {
    const application = await Application.findByPk(applicationId, {
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
        },
        {
          model: Job,
          as: "job",
          attributes: ["id", "companyId"],
          required: true,
        },
      ],
    }) as ResumeAccessApplication | null;

    if (!application) {
      throw createError("Application not found", 404);
    }

    const candidateOwnsApplication =
      requester.role === "CANDIDATE" &&
      application.candidateProfile?.userId === requester.userId;
    const recruiterOwnsJob =
      requester.role === "RECRUITER" &&
      Boolean(requester.companyId) &&
      application.job?.companyId === requester.companyId;
    const adminAccess = requester.role === "ADMIN";

    if (!candidateOwnsApplication && !recruiterOwnsJob && !adminAccess) {
      throw createError("You cannot access this application's CV", 403);
    }

    if (!application.resumeFileUrl || !application.resumeOriginalFilename) {
      throw createError("Application CV not found", 404);
    }

    try {
      return {
        body: await applicationResumeService.read(application.resumeFileUrl),
        contentType: resumeContentType(application.resumeFileUrl),
        filename: application.resumeOriginalFilename,
      };
    } catch {
      throw createError("Application CV not found", 404);
    }
  }

  async updateStage(
    application: Application,
    stage: ApplicationStage,
    interview: { interviewDate?: string | null } = {},
  ) {
    const previousStage = application.stage;

    // A date is never required to move stage — omitting it leaves
    // interviewDate untouched so the transition itself cannot be blocked.
    await application.update({
      stage,
      ...this.interviewAttributes(application, interview),
    });

    // The ownership guard loads a minimal job association. Reload without it
    // so ownership-only job metadata does not alter the response contract.
    const updated = await Application.findByPk(application.id);

    if (!updated) {
      throw createError("Application not found", 404);
    }

    // Notifies the candidate and refreshes every recruiter's pipeline row.
    emit(
      notificationService.recordStageChange(updated.id, previousStage),
      `stage change on application ${updated.id}`,
    );

    return this.serialize(updated, true);
  }

  /**
   * Stage-independent by design: notes and dates are recruiter working
   * memory, useful on an APPLIED candidate and still editable after OFFER or
   * REJECTED. Concurrent edits are last-write-wins.
   */
  async updateInterview(
    application: Application,
    input: {
      interviewDate?: string | null;
      recruiterNotes?: string | null;
    },
  ) {
    await application.update(this.interviewAttributes(application, input));

    const updated = await Application.findByPk(application.id);

    if (!updated) {
      throw createError("Application not found", 404);
    }

    // No notification — a scheduled date is recruiter-side context, and the
    // candidate is not shown these fields. Other recruiters' open pipelines
    // still need the row to refresh.
    emit(
      notificationService.broadcastApplicationChange(updated.id),
      `interview update on application ${updated.id}`,
    );

    return this.serialize(updated, true);
  }

  async assignInterviewer(
    application: Application,
    interviewerId: string,
    companyId: string,
  ) {
    const interviewer = await User.findOne({
      where: {
        id: interviewerId,
        role: "INTERVIEWER",
        companyId,
      },
    });

    if (!interviewer) {
      throw createError(
        "Interviewer not found",
        404,
      );
    }

    const [assignment] = await InterviewAssignment.findOrCreate({
      where: {
        applicationId: application.id,
        interviewerId,
      },
    });

    return assignment;
  }
}

export const applicationService = new ApplicationService();
