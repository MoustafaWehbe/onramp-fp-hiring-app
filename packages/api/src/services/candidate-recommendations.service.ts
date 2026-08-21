import {
  Application,
  CandidateJobRecommendation,
  CandidateProfile,
  Company,
  Job,
  Skill,
} from "@starter-kit/shared/db";
import { hasEnoughProfileToScore } from "@starter-kit/shared/ai";
import { Op } from "sequelize";
import { createError } from "../middleware/error-handler";
import { scheduleCandidateRecommendations } from "./recommendations-queue.service";

/** Anything older than this is refreshed in the background on next read. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 6;

type ProfileWithSkills = CandidateProfile & { skills?: Skill[] };

export class CandidateRecommendationsService {
  /**
   * Serves the cache, but never trusts it.
   *
   * A cached row is only as good as the moment it was written: the job may
   * have closed, or the candidate may have applied since. Both are re-checked
   * here by joining against live data rather than by hoping the refresh job
   * ran in time.
   */
  async list(userId: string, limit = DEFAULT_LIMIT) {
    const profile = (await CandidateProfile.findOne({
      where: { userId },
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: false,
        },
      ],
    })) as ProfileWithSkills | null;

    if (!profile) {
      throw createError("Candidate profile not found", 404);
    }

    const profileIsScorable = hasEnoughProfileToScore({
      headline: profile.headline ?? null,
      summary: profile.bio ?? null,
      skills: (profile.skills ?? []).map((skill) => skill.name),
      yearsExperience: null,
    });

    const appliedJobIds = (
      await Application.findAll({
        attributes: ["jobId"],
        where: {
          candidateProfileId: profile.id,
          stage: { [Op.ne]: "DRAFT" },
        },
        raw: true,
      })
    ).map((application) => application.jobId);

    // Whether a scoring pass has ever completed for this profile, independent
    // of whether it left any eligible rows (a candidate who has applied to
    // every open job scores zero on purpose — that is a real "ready, nothing
    // left" state, not "computing"). candidate_job_recommendations row
    // presence can't answer this, since that case is legitimately empty;
    // recommendationsComputedAt is a durable marker set on every pass
    // regardless of outcome. Determines status/staleness — the filtered
    // `cached` query below decides only what is actually displayed.
    const hasEverBeenScored = profile.recommendationsComputedAt != null;
    const isStale =
      hasEverBeenScored &&
      Date.now() - profile.recommendationsComputedAt!.getTime() >
        STALE_AFTER_MS;

    const cached = await CandidateJobRecommendation.findAll({
      where: {
        candidateProfileId: profile.id,
        ...(appliedJobIds.length > 0
          ? { jobId: { [Op.notIn]: appliedJobIds } }
          : {}),
      },
      include: [
        {
          model: Job,
          as: "job",
          // The inner join on status is the serve-time guard: a job closed
          // after being scored simply drops out of the result.
          where: { status: "OPEN" },
          required: true,
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name", "logoUrl"],
              required: true,
            },
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
      order: [
        ["score", "DESC"],
        ["computedAt", "DESC"],
      ],
      limit,
    });

    // A first visit has nothing scored yet; a stale score set is still served
    // while a fresh pass runs, so the candidate never waits on the queue.
    if (profileIsScorable && (!hasEverBeenScored || isStale)) {
      scheduleCandidateRecommendations(
        profile.id,
        hasEverBeenScored ? "scheduled" : "first-visit",
      );
    }

    return {
      status: this.resolveStatus(profileIsScorable, hasEverBeenScored),
      recommendations: cached.map((row) => {
        const job = row.get("job") as
          | (Job & { company?: Company; skills?: Skill[] })
          | undefined;

        return {
          jobId: row.jobId,
          score: row.score,
          reason: row.reason ?? null,
          matchedSkills: row.matchedSkills ?? [],
          computedAt: row.computedAt,
          job: job
            ? {
                id: job.id,
                title: job.title,
                location: job.location ?? null,
                isRemote: job.isRemote,
                employmentType: job.employmentType,
                experienceMin: job.experienceMin,
                experienceMax: job.experienceMax,
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                salaryCurrency: job.salaryCurrency,
                skills: (job.skills ?? []).map((skill) => skill.name),
                createdAt: job.createdAt,
                company: job.company
                  ? {
                      id: job.company.id,
                      name: job.company.name,
                      logoUrl: job.company.logoUrl ?? null,
                    }
                  : null,
              }
            : null,
        };
      }),
    };
  }

  private resolveStatus(
    profileIsScorable: boolean,
    hasEverBeenScored: boolean,
  ): "ready" | "computing" | "insufficient-profile" {
    if (!profileIsScorable) {
      return "insufficient-profile";
    }

    return hasEverBeenScored ? "ready" : "computing";
  }

  /** Queued when a profile changes materially enough to move scores. */
  refreshFor(candidateProfileId: string, trigger: "profile-updated"): void {
    scheduleCandidateRecommendations(candidateProfileId, trigger);
  }
}

export const candidateRecommendationsService =
  new CandidateRecommendationsService();
