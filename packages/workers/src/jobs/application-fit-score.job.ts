import type { Job as QueueJob } from "bullmq";
import {
  Application,
  Job,
  Skill,
  scoreApplicationFit,
  InsufficientResumeSignalsError,
  type ApplicationFitScoreJobData,
  type ApplicationFitScoreJobResult,
} from "@starter-kit/shared";

type ApplicationWithJob = Application & {
  job?: Job & { skills?: Skill[] };
};

function sameResumeVersion(
  application: Application,
  requestedResumeUploadedAt: string | null,
): boolean {
  const currentResumeUploadedAt =
    application.resumeUploadedAt?.toISOString() ?? null;
  return currentResumeUploadedAt === requestedResumeUploadedAt;
}

async function markFailed(
  application: Application,
  requestedResumeUploadedAt: string | null,
): Promise<boolean> {
  const current = await Application.findByPk(application.id);

  if (
    !current ||
    current.aiScoringStatus !== "pending" ||
    !sameResumeVersion(current, requestedResumeUploadedAt)
  ) {
    return false;
  }

  await current.update({
    fitScore: null,
    aiSummary: null,
    aiStrengths: null,
    aiGaps: null,
    aiScoredAt: null,
    aiScoringStatus: "failed",
  });
  return true;
}

export async function processApplicationFitScoreJobWithScorer(
  queueJob: QueueJob<
    ApplicationFitScoreJobData,
    ApplicationFitScoreJobResult
  >,
  score: typeof scoreApplicationFit,
): Promise<ApplicationFitScoreJobResult> {
  const { applicationId, resumeUploadedAt } = queueJob.data;
  const application = await Application.findByPk(applicationId, {
    include: [
      {
        model: Job,
        as: "job",
        required: true,
        include: [
          {
            model: Skill,
            as: "skills",
            attributes: ["name"],
            through: { attributes: [] },
            required: false,
          },
        ],
      },
    ],
  }) as ApplicationWithJob | null;

  if (
    !application ||
    !application.job ||
    application.stage === "DRAFT" ||
    application.aiScoringStatus !== "pending" ||
    !sameResumeVersion(application, resumeUploadedAt)
  ) {
    return { status: "stale" };
  }

  try {
    const result = await score({
      job: {
        title: application.job.title,
        description: application.job.description,
        experienceMin: application.job.experienceMin,
        experienceMax: application.job.experienceMax,
        requiredSkills:
          application.job.skills?.map((skill) => skill.name) ?? [],
      },
      resume: {
        text: application.resumeText ?? null,
        parsedSkills: application.parsedSkills ?? [],
        parsedYearsExperience:
          application.parsedYearsExperience ?? null,
      },
    });
    const current = await Application.findByPk(application.id);

    if (
      !current ||
      current.aiScoringStatus !== "pending" ||
      !sameResumeVersion(current, resumeUploadedAt)
    ) {
      return { status: "stale" };
    }

    await current.update({
      fitScore: result.fit_score,
      aiSummary: result.summary,
      aiStrengths: result.strengths,
      aiGaps: result.gaps,
      aiScoredAt: new Date(),
      aiScoringStatus: "completed",
    });

    return {
      status: "completed",
      fitScore: result.fit_score,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof InsufficientResumeSignalsError) {
      await markFailed(application, resumeUploadedAt);
      console.error(
        `[application-fit-score] Application ${applicationId} cannot be scored: ${message}`,
      );
      return { status: "failed" };
    }

    const configuredAttempts = queueJob.opts.attempts ?? 1;
    const isFinalAttempt =
      queueJob.attemptsMade + 1 >= configuredAttempts;

    if (isFinalAttempt) {
      await markFailed(application, resumeUploadedAt);
    }

    console.error(
      `[application-fit-score] Application ${applicationId} scoring attempt failed: ${message}`,
    );
    throw error;
  }
}

export async function processApplicationFitScoreJob(
  queueJob: QueueJob<
    ApplicationFitScoreJobData,
    ApplicationFitScoreJobResult
  >,
): Promise<ApplicationFitScoreJobResult> {
  return processApplicationFitScoreJobWithScorer(
    queueJob,
    scoreApplicationFit,
  );
}
