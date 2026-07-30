import { Application, Job, User } from "../db";
import { publishRealtimeAndForget } from "./bus";
import type { RealtimeApplicationPayload } from "./types";

/**
 * Lives in shared rather than in the API's notification service because two
 * processes raise this event: the API (stage change, rescore, interview edit)
 * and the workers process (a fit score landing). One implementation keeps the
 * recipient rule — recruiters at the company that owns the job — identical
 * on both sides.
 *
 * Recipients are resolved here, at publish time, so the process that finally
 * writes to a socket never makes an authorization decision.
 */
export async function publishApplicationChanged(
  applicationId: string,
): Promise<void> {
  const application = (await Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: "job",
        attributes: ["id", "companyId"],
        required: true,
      },
    ],
  })) as (Application & { job?: Job }) | null;

  // A DRAFT is candidate-private and never appears in a recruiter pipeline.
  if (!application || !application.job || application.stage === "DRAFT") {
    return;
  }

  const recruiters = await User.findAll({
    attributes: ["id"],
    where: { companyId: application.job.companyId, role: "RECRUITER" },
  });

  const payload: RealtimeApplicationPayload = {
    applicationId: application.id,
    jobId: application.jobId,
    stage: application.stage,
    aiScoringStatus: application.aiScoringStatus,
    fitScore: application.fitScore ?? null,
    interviewDate: application.interviewDate?.toISOString() ?? null,
  };

  publishRealtimeAndForget({
    userIds: recruiters.map((recruiter) => recruiter.id),
    event: { name: "application.changed", payload },
  });
}
