import {
  Application,
  CandidateProfile,
  Job,
  Notification,
  User,
} from "@starter-kit/shared/db";
import type { ApplicationStage, NotificationType } from "@starter-kit/shared/db";
import {
  publishApplicationChanged,
  publishRealtimeAndForget,
  type RealtimeNotificationPayload,
} from "@starter-kit/shared/realtime";
import { Op } from "sequelize";
import { createError } from "../middleware/error-handler";

const STAGE_LABELS: Record<ApplicationStage, string> = {
  DRAFT: "draft",
  APPLIED: "applied",
  REVIEWED: "under review",
  INTERVIEWING: "interviewing",
  OFFER: "offer",
  HIRED: "hired",
  REJECTED: "not moving forward",
};

interface ListOptions {
  limit: number;
  offset: number;
  status: "all" | "read" | "unread";
}

type ApplicationWithContext = Application & {
  job?: Job;
  candidateProfile?: CandidateProfile;
};

/**
 * The single place notifications are created and realtime events are raised.
 * Controllers never build a notification themselves — they call one of the
 * record* methods at the point of mutation, so adding a recipient or a new
 * event consumer is one edit here rather than a hunt through call sites.
 */
export class NotificationService {
  private serialize(
    notification: Notification,
    relatedJobId: string | null = null,
  ): RealtimeNotificationPayload {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? null,
      relatedApplicationId: notification.relatedApplicationId ?? null,
      relatedJobId,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private async loadContext(
    applicationId: string,
  ): Promise<ApplicationWithContext | null> {
    return (await Application.findByPk(applicationId, {
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title", "companyId"],
          required: true,
        },
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
          include: [
            { model: User, as: "user", attributes: ["id", "name"] },
          ],
        },
      ],
    })) as ApplicationWithContext | null;
  }

  /** Every recruiter at the company that owns the job. */
  private async recruiterIdsForCompany(
    companyId: string,
  ): Promise<string[]> {
    const recruiters = await User.findAll({
      attributes: ["id"],
      where: { companyId, role: "RECRUITER" },
    });
    return recruiters.map((recruiter) => recruiter.id);
  }

  private async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string | null;
    relatedApplicationId?: string | null;
    relatedJobId?: string | null;
  }): Promise<RealtimeNotificationPayload> {
    const notification = await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      relatedApplicationId: input.relatedApplicationId ?? null,
    });

    return this.serialize(notification, input.relatedJobId ?? null);
  }

  /**
   * Pushes a pipeline row update to every recruiter allowed to see it. Shared
   * with the workers process, which raises the same event when a fit score
   * lands, so both use one recipient rule.
   */
  async broadcastApplicationChange(applicationId: string): Promise<void> {
    await publishApplicationChanged(applicationId);
  }

  /** A candidate submitted — notify the job's recruiters. */
  async recordNewApplication(applicationId: string): Promise<void> {
    const application = await this.loadContext(applicationId);

    if (!application?.job || application.stage === "DRAFT") {
      return;
    }

    const recruiterIds = await this.recruiterIdsForCompany(
      application.job.companyId,
    );

    if (recruiterIds.length === 0) {
      return;
    }

    const candidateName =
      (application.candidateProfile?.get("user") as User | undefined)?.name ??
      "A candidate";

    // One row per recipient so read state is per-recruiter.
    for (const userId of recruiterIds) {
      const payload = await this.create({
        userId,
        type: "new_application",
        title: `${candidateName} applied to ${application.job.title}`,
        body: "Open the pipeline to review this application.",
        relatedApplicationId: application.id,
        relatedJobId: application.jobId,
      });

      publishRealtimeAndForget({
        userIds: [userId],
        event: { name: "notification", payload },
      });
    }

    // The pipeline itself gains a row, so push that too.
    await publishApplicationChanged(application.id);
  }

  /** A recruiter moved the application — notify the candidate who owns it. */
  async recordStageChange(
    applicationId: string,
    previousStage: ApplicationStage,
  ): Promise<void> {
    const application = await this.loadContext(applicationId);

    if (!application?.job || !application.candidateProfile) {
      return;
    }

    if (application.stage !== previousStage) {
      const payload = await this.create({
        userId: application.candidateProfile.userId,
        type: "stage_change",
        title: `Your application for ${application.job.title} is now ${STAGE_LABELS[application.stage]}`,
        body: `Moved from ${STAGE_LABELS[previousStage]} to ${STAGE_LABELS[application.stage]}.`,
        relatedApplicationId: application.id,
        relatedJobId: application.jobId,
      });

      publishRealtimeAndForget({
        userIds: [application.candidateProfile.userId],
        event: { name: "notification", payload },
      });
    }

    await this.broadcastApplicationChange(applicationId);
  }

  async list(userId: string, options: ListOptions) {
    const where: Record<string, unknown> = { userId };

    if (options.status === "unread") {
      where.readAt = { [Op.is]: null };
    } else if (options.status === "read") {
      where.readAt = { [Op.not]: null };
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      include: [
        {
          model: Application,
          as: "relatedApplication",
          attributes: ["id", "jobId"],
          required: false,
        },
      ],
      // The id tiebreak keeps two notifications written in the same
      // millisecond (two quick stage changes) in a stable, correct order.
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit: options.limit,
      offset: options.offset,
    });

    const unreadCount = await Notification.count({
      where: { userId, readAt: { [Op.is]: null } },
    });

    return {
      notifications: rows.map((notification) => {
        const related = notification.get("relatedApplication") as
          | Application
          | undefined;
        return this.serialize(notification, related?.jobId ?? null);
      }),
      total: count,
      unreadCount,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + rows.length < count,
    };
  }

  /** Scoped by userId in the WHERE clause — never loaded then checked. */
  async markRead(userId: string, notificationId: string) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
      include: [
        {
          model: Application,
          as: "relatedApplication",
          attributes: ["id", "jobId"],
          required: false,
        },
      ],
    });

    if (!notification) {
      throw createError("Notification not found", 404);
    }

    if (!notification.readAt) {
      await notification.update({ readAt: new Date() });
    }

    const related = notification.get("relatedApplication") as
      | Application
      | undefined;
    return this.serialize(notification, related?.jobId ?? null);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const [updated] = await Notification.update(
      { readAt: new Date() },
      { where: { userId, readAt: { [Op.is]: null } } },
    );

    return { updated };
  }
}

export const notificationService = new NotificationService();
