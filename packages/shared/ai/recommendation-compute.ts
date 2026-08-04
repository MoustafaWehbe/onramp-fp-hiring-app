import { Op } from "sequelize";
import {
  Application,
  CandidateJobRecommendation,
  CandidateProfile,
  Job,
  Skill,
  WorkExperience,
} from "../db";
import {
  InsufficientProfileError,
  scoreJobForCandidate,
  type RecommendationCandidate,
} from "./job-recommendation";

/**
 * Lives in shared because two processes need it: the workers process runs it
 * on the queue, and the API's tests drive it directly. Same rule for who gets
 * scored against what, wherever it runs.
 */

export interface RecommendationComputeResult {
  status: "completed" | "insufficient-profile" | "no-open-jobs";
  scored: number;
}

type ProfileWithRelations = CandidateProfile & {
  skills?: Skill[];
  workExperiences?: WorkExperience[];
};

/**
 * Years of experience inferred from the profile's own work history, falling
 * back to whatever the most recent resume parse found. The profile wins:
 * once a candidate has entered their history by hand, that is the better
 * source, and a later re-parse must not quietly override it.
 */
export function inferYearsExperience(
  profile: ProfileWithRelations,
  parsedYearsExperience: number | null,
): number | null {
  const experiences = profile.workExperiences ?? [];

  if (experiences.length === 0) {
    return parsedYearsExperience;
  }

  const totalMs = experiences.reduce((sum, experience) => {
    const start = new Date(experience.startDate).getTime();
    const end = experience.endDate
      ? new Date(experience.endDate).getTime()
      : Date.now();

    return sum + Math.max(0, end - start);
  }, 0);

  const years = totalMs / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
}

export async function buildRecommendationCandidate(
  profile: ProfileWithRelations,
): Promise<RecommendationCandidate> {
  // The most recent parse is only a fallback for years of experience; skills
  // come from the profile's own normalized list.
  const latestParsed = await Application.findOne({
    attributes: ["parsedYearsExperience"],
    where: {
      candidateProfileId: profile.id,
      parsedYearsExperience: { [Op.ne]: null },
    },
    order: [["resumeUploadedAt", "DESC"]],
  });

  return {
    headline: profile.headline ?? null,
    summary: profile.bio ?? null,
    skills: (profile.skills ?? []).map((skill) => skill.name),
    yearsExperience: inferYearsExperience(
      profile,
      latestParsed?.parsedYearsExperience ?? null,
    ),
  };
}

/**
 * Rescores every open job the candidate has not applied to and replaces their
 * cached rows.
 *
 * Applied-to jobs are excluded here *and* at serve time: this pass keeps the
 * cache tidy, but a candidate can apply a second after it runs, so the read
 * path re-checks rather than trusting these rows.
 */
export async function computeCandidateRecommendations(
  candidateProfileId: string,
): Promise<RecommendationComputeResult> {
  const profile = (await CandidateProfile.findByPk(candidateProfileId, {
    include: [
      {
        model: Skill,
        as: "skills",
        attributes: ["id", "name"],
        through: { attributes: [] },
        required: false,
      },
      {
        model: WorkExperience,
        as: "workExperiences",
        attributes: ["startDate", "endDate"],
        required: false,
      },
    ],
  })) as ProfileWithRelations | null;

  if (!profile) {
    return { status: "insufficient-profile", scored: 0 };
  }

  const candidate = await buildRecommendationCandidate(profile);

  const appliedJobs = await Application.findAll({
    attributes: ["jobId"],
    where: {
      candidateProfileId,
      stage: { [Op.ne]: "DRAFT" },
    },
    raw: true,
  });
  const appliedJobIds = appliedJobs.map((application) => application.jobId);

  const openJobs = (await Job.findAll({
    where: {
      status: "OPEN",
      ...(appliedJobIds.length > 0 ? { id: { [Op.notIn]: appliedJobIds } } : {}),
    },
    include: [
      {
        model: Skill,
        as: "skills",
        attributes: ["name"],
        through: { attributes: [] },
        required: false,
      },
    ],
  })) as Array<Job & { skills?: Skill[] }>;

  if (openJobs.length === 0) {
    // Nothing to recommend is not a failure; clear stale rows and say so.
    await CandidateJobRecommendation.destroy({ where: { candidateProfileId } });
    return { status: "no-open-jobs", scored: 0 };
  }

  const computedAt = new Date();
  const scored: Array<{
    candidateProfileId: string;
    jobId: string;
    score: number;
    reason: string;
    matchedSkills: string[];
    computedAt: Date;
  }> = [];

  for (const job of openJobs) {
    try {
      const result = await scoreJobForCandidate(candidate, {
        title: job.title,
        description: job.description,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        requiredSkills: (job.skills ?? []).map((skill) => skill.name),
      });

      scored.push({
        candidateProfileId,
        jobId: job.id,
        score: result.score,
        reason: result.reason,
        matchedSkills: result.matchedSkills,
        computedAt,
      });
    } catch (error) {
      if (error instanceof InsufficientProfileError) {
        // The profile, not this job, is the problem — stop rather than
        // grinding through every job to fail identically each time.
        await CandidateJobRecommendation.destroy({
          where: { candidateProfileId },
        });
        return { status: "insufficient-profile", scored: 0 };
      }

      const detail = error instanceof Error ? error.message : String(error);
      console.error(
        `[recommendations] job ${job.id} for profile ${candidateProfileId}: ${detail}`,
      );
    }
  }

  // Replace wholesale: a job that dropped out of the result set (closed, or
  // now applied to) must not linger from the previous run.
  await CandidateJobRecommendation.destroy({ where: { candidateProfileId } });

  if (scored.length > 0) {
    await CandidateJobRecommendation.bulkCreate(scored);
  }

  return { status: "completed", scored: scored.length };
}
