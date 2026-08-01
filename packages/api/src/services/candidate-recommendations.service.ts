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

    const oldest = cached.reduce<number | null>((oldestAt, row) => {
      const time = row.computedAt.getTime();
      return oldestAt === null || time < oldestAt ? time : oldestAt;
    }, null);
    const isStale =
      oldest !== null && Date.now() - oldest > STALE_AFTER_MS;

    // A first visit has nothing cached; a stale cache is still served while a
    // fresh pass runs, so the candidate never waits on the queue.
    if (profileIsScorable && (cached.length === 0 || isStale)) {
      scheduleCandidateRecommendations(
        profile.id,
        cached.length === 0 ? "first-visit" : "scheduled",
      );
    }

    return {
      status: this.resolveStatus(profileIsScorable, cached.length),
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
                salaryMin: job.salaryMin,
                salaryMax: job.salaryMax,
                salaryCurrency: job.salaryCurrency,
                skills: (job.skills ?? []).map((skill) => skill.name),
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
    cachedCount: number,
  ): "ready" | "computing" | "insufficient-profile" {
    if (!profileIsScorable) {
      return "insufficient-profile";
    }

    return cachedCount === 0 ? "computing" : "ready";
  }

  /** Queued when a profile changes materially enough to move scores. */
  refreshFor(candidateProfileId: string, trigger: "profile-updated"): void {
    scheduleCandidateRecommendations(candidateProfileId, trigger);
  }
}

export const candidateRecommendationsService =
  new CandidateRecommendationsService();
