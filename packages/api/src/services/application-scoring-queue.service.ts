import { Application } from "@starter-kit/shared/db";

function resumeVersion(application: Application): string | null {
  return application.resumeUploadedAt?.toISOString() ?? null;
}

async function markQueueFailure(
  applicationId: string,
  requestedResumeUploadedAt: string | null,
): Promise<void> {
  const application = await Application.findByPk(applicationId);

  if (
    !application ||
    application.aiScoringStatus !== "pending" ||
    resumeVersion(application) !== requestedResumeUploadedAt
  ) {
    return;
  }

  await application.update({
    fitScore: null,
    aiSummary: null,
    aiStrengths: null,
    aiGaps: null,
    aiScoredAt: null,
    aiScoringStatus: "failed",
  });
}

export async function enqueueApplicationFitScore(
  application: Application,
): Promise<void> {
  const requestedResumeUploadedAt = resumeVersion(application);
  const { applicationFitScoreQueue } = await import("../lib/queue");

  await applicationFitScoreQueue.add("score-application-fit", {
    applicationId: application.id,
    resumeUploadedAt: requestedResumeUploadedAt,
  });
}

export function scheduleApplicationFitScore(
  application: Application,
): void {
  const requestedResumeUploadedAt = resumeVersion(application);

  void enqueueApplicationFitScore(application).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[application-fit-score] Failed to queue application ${application.id}: ${message}`,
    );

    try {
      await markQueueFailure(
        application.id,
        requestedResumeUploadedAt,
      );
    } catch (updateError) {
      console.error(
        `[application-fit-score] Failed to persist queue failure for application ${application.id}:`,
        updateError,
      );
    }
  });
}
