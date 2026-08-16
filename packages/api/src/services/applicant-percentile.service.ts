import { Application, CandidateProfile, Job, Skill } from "@starter-kit/shared/db";
import { Op } from "sequelize";
import {
  scoreResumeForApplication,
  isResumeReviewConfigured,
} from "@starter-kit/shared/ai";
import { createError } from "../middleware/error-handler";
import { computeTopPercentile } from "../lib/applicant-percentile";

type ApplicationWithCandidate = Application & {
  candidateProfile?: CandidateProfile;
};

type JobWithSkills = Job & { skills?: Skill[] };

export interface ApplicantPercentileResult {
  available: boolean;
  percentile?: number;
}

/**
 * "Applicant Percentile Score" — a candidate-only, one-time-computed rank
 * against the other applicants for the same job, shown right after applying.
 *
 * Reuses the resume-review AI module's scoring (packages/shared/ai/resume-review.ts)
 * rather than the separate fit-score module: the two exist for different
 * audiences (this one candidate-facing and private, fit-score.ts recruiter-
 * facing) and reusing fit-score's async worker would have mixed those two
 * concerns onto one field.
 *
 * Deliberately never reuses a prior "Review with AI" result even when one
 * exists: that call runs at temperature 0.2 for varied, conversational
 * suggestions, and its result is never persisted server-side in the first
 * place (by that feature's own design), so there is nothing to reuse. This
 * service always computes one fresh, temperature-0 score at application
 * time — the first and only AI call this feature ever makes for a given
 * application, not a duplicate of anything.
 */
export class ApplicantPercentileService {
  async computeForApplication(
    applicationId: string,
    userId: string,
  ): Promise<ApplicantPercentileResult> {
    const application = (await Application.findByPk(applicationId, {
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
        },
      ],
    })) as ApplicationWithCandidate | null;

    if (!application || application.candidateProfile?.userId !== userId) {
      throw createError("Application not found", 404);
    }

    // Locked in the first time it's computed. A candidate who calls this
    // twice (a re-render, a retry) gets back the exact number they saw the
    // first time, not a fresh recomputation against a pool that has since
    // grown.
    if (
      application.resumeReviewPercentile !== null &&
      application.resumeReviewPercentile !== undefined
    ) {
      return { available: true, percentile: application.resumeReviewPercentile };
    }

    // Not every application has scorable resume text (no CV attached, or one
    // that failed to parse) — this is an expected, non-error outcome, not a
    // failure to surface to the candidate right after a successful apply.
    if (!isResumeReviewConfigured() || !application.resumeText?.trim()) {
      return { available: false };
    }

    const job = (await Job.findByPk(application.jobId, {
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["name"],
          through: { attributes: [] },
          required: false,
        },
      ],
    })) as JobWithSkills | null;

    if (!job) {
      return { available: false };
    }

    let score: number;

    try {
      const result = await scoreResumeForApplication({
        job: {
          title: job.title,
          description: job.description,
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
          requiredSkills: job.skills?.map((skill) => skill.name) ?? [],
        },
        resume: { text: application.resumeText },
      });
      score = result.score;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(
        `[applicant-percentile] scoring failed for application ${applicationId}: ${detail}`,
      );
      return { available: false };
    }

    await application.update({
      resumeReviewScore: score,
      resumeReviewScoredAt: new Date(),
    });

    // Every other already-scored, non-draft applicant for this job — the
    // candidate's own just-persisted score is added explicitly rather than
    // relied on to come back from this query, so the pool doesn't depend on
    // read-after-write timing.
    const peers = await Application.findAll({
      where: {
        jobId: application.jobId,
        id: { [Op.ne]: application.id },
        stage: { [Op.ne]: "DRAFT" },
        resumeReviewScore: { [Op.ne]: null },
      },
      attributes: ["resumeReviewScore"],
    });
    const poolScores = [
      score,
      ...peers
        .map((peer) => peer.resumeReviewScore)
        .filter((value): value is number => typeof value === "number"),
    ];

    const percentile = computeTopPercentile(score, poolScores);
    await application.update({ resumeReviewPercentile: percentile });

    return { available: true, percentile };
  }
}

export const applicantPercentileService = new ApplicantPercentileService();
