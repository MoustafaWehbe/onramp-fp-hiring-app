import {
  Application,
  CandidatePoolEntry,
  CandidatePoolTag,
  CandidateProfile,
  CandidateTag,
  InterviewScorecard,
  Job,
  ScorecardRating,
  Skill,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import {
  Op,
  UniqueConstraintError,
  col,
  fn,
  where as sqlWhere,
  type Transaction,
} from "sequelize";
import { createError } from "../middleware/error-handler";
import type { RecruiterCandidateFilters } from "../schemas/talent-pool.schemas";
import { notificationService } from "./notifications.service";

type ApplicationWithJob = Application & { job?: Job };
type CandidateWithRelations = CandidateProfile & {
  user?: User;
  skills?: Skill[];
};
type PoolEntryWithTags = CandidatePoolEntry & { tags?: CandidateTag[] };
type ScorecardWithRatings = InterviewScorecard & {
  ratings?: ScorecardRating[];
};

interface PoolInput {
  notes?: string | null;
  tagIds?: string[];
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export class TalentPoolService {
  private async hasAppliedToCompany(
    companyId: string,
    candidateId: string,
    transaction?: Transaction,
  ): Promise<boolean> {
    return (
      (await Application.count({
        where: {
          candidateProfileId: candidateId,
          stage: { [Op.ne]: "DRAFT" },
        },
        include: [
          {
            model: Job,
            as: "job",
            attributes: [],
            where: { companyId },
            required: true,
          },
        ],
        transaction,
      })) > 0
    );
  }

  private serializePoolEntry(entry: PoolEntryWithTags) {
    const tags = entry.tags ?? [];
    return {
      id: entry.id,
      notes: entry.notes ?? null,
      addedAt: entry.addedAt,
      addedBy: entry.addedBy ?? null,
      tags: tags
        .map((tag) => ({ id: tag.id, label: tag.label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    };
  }

  private async loadPoolEntry(
    companyId: string,
    candidateId: string,
    transaction?: Transaction,
  ): Promise<PoolEntryWithTags | null> {
    return (await CandidatePoolEntry.findOne({
      where: { companyId, candidateId },
      include: [
        {
          model: CandidateTag,
          as: "tags",
          attributes: ["id", "label"],
          through: { attributes: [] },
        },
      ],
      transaction,
    })) as PoolEntryWithTags | null;
  }

  private async validateTagIds(
    companyId: string,
    tagIds: string[],
    transaction: Transaction,
  ): Promise<string[]> {
    const uniqueTagIds = [...new Set(tagIds)];
    if (uniqueTagIds.length === 0) {
      return [];
    }

    const count = await CandidateTag.count({
      where: { id: { [Op.in]: uniqueTagIds }, companyId },
      transaction,
    });
    if (count !== uniqueTagIds.length) {
      throw createError("One or more tags do not belong to your company", 422);
    }
    return uniqueTagIds;
  }

  private async replaceTags(
    entryId: string,
    companyId: string,
    tagIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    const validTagIds = await this.validateTagIds(
      companyId,
      tagIds,
      transaction,
    );
    await CandidatePoolTag.destroy({
      where: { poolEntryId: entryId },
      transaction,
    });
    if (validTagIds.length > 0) {
      await CandidatePoolTag.bulkCreate(
        validTagIds.map((tagId) => ({ poolEntryId: entryId, tagId })),
        { transaction },
      );
    }
  }

  private async loadCandidates(companyId: string, candidateId?: string) {
    const applications = (await Application.findAll({
      attributes: [
        "id",
        "candidateProfileId",
        "jobId",
        "stage",
        "submittedAt",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeUploadedAt",
        "parsedYearsExperience",
        "parsedSkills",
        "fitScore",
        "aiSummary",
        "aiStrengths",
        "aiGaps",
        "aiScoredAt",
        "aiScoringStatus",
        "interviewDate",
        "recruiterNotes",
        "interviewScheduledAt",
        "createdAt",
        "updatedAt",
      ],
      where: {
        stage: { [Op.ne]: "DRAFT" },
        ...(candidateId ? { candidateProfileId: candidateId } : {}),
      },
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title", "status"],
          where: { companyId },
          required: true,
        },
      ],
      order: [
        ["submittedAt", "DESC"],
        ["createdAt", "DESC"],
      ],
    })) as ApplicationWithJob[];

    const candidateIds = [
      ...new Set(applications.map((application) => application.candidateProfileId)),
    ];
    if (candidateIds.length === 0) {
      return [];
    }

    const applicationIds = applications.map((application) => application.id);
    const [profiles, poolEntries, scorecards] = await Promise.all([
      CandidateProfile.findAll({
        where: { id: { [Op.in]: candidateIds } },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
            required: true,
          },
          {
            model: Skill,
            as: "skills",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      }) as Promise<CandidateWithRelations[]>,
      CandidatePoolEntry.findAll({
        where: { companyId, candidateId: { [Op.in]: candidateIds } },
        include: [
          {
            model: CandidateTag,
            as: "tags",
            attributes: ["id", "label"],
            through: { attributes: [] },
          },
        ],
      }) as Promise<PoolEntryWithTags[]>,
      InterviewScorecard.findAll({
        where: { applicationId: { [Op.in]: applicationIds } },
        include: [
          {
            model: ScorecardRating,
            as: "ratings",
            attributes: ["rating"],
          },
        ],
      }) as Promise<ScorecardWithRatings[]>,
    ]);

    const applicationsByCandidate = new Map<string, ApplicationWithJob[]>();
    for (const application of applications) {
      const rows = applicationsByCandidate.get(application.candidateProfileId) ?? [];
      rows.push(application);
      applicationsByCandidate.set(application.candidateProfileId, rows);
    }
    const poolByCandidate = new Map(
      poolEntries.map((entry) => [entry.candidateId, entry]),
    );
    const scorecardsByApplication = new Map<string, ScorecardWithRatings[]>();
    for (const scorecard of scorecards) {
      const rows = scorecardsByApplication.get(scorecard.applicationId) ?? [];
      rows.push(scorecard);
      scorecardsByApplication.set(scorecard.applicationId, rows);
    }

    return profiles.map((profile) => {
      const user = profile.user!;
      const candidateApplications = applicationsByCandidate.get(profile.id) ?? [];
      const candidateRatings: number[] = [];

      const applicationInsights = candidateApplications.map((application) => {
        const job = application.job!;
        const applicationScorecards =
          scorecardsByApplication.get(application.id) ?? [];
        const ratings = applicationScorecards.flatMap((scorecard) =>
          (scorecard.ratings ?? []).map((rating) => rating.rating),
        );
        candidateRatings.push(...ratings);

        return {
          applicationId: application.id,
          jobId: application.jobId,
          jobTitle: job.title,
          jobStatus: job.status,
          stage: application.stage,
          submittedAt: application.submittedAt ?? application.createdAt,
          resumeOriginalFilename: application.resumeOriginalFilename ?? null,
          resumeUploadedAt: application.resumeUploadedAt ?? null,
          parsedYearsExperience: application.parsedYearsExperience ?? null,
          parsedSkills: application.parsedSkills ?? [],
          resumeDownloadUrl:
            application.resumeFileUrl && application.resumeOriginalFilename
              ? `/api/applications/${application.id}/resume`
              : null,
          fitScore: application.fitScore ?? null,
          aiSummary: application.aiSummary ?? null,
          aiStrengths: application.aiStrengths ?? [],
          aiGaps: application.aiGaps ?? [],
          aiScoredAt: application.aiScoredAt ?? null,
          aiScoringStatus: application.aiScoringStatus,
          interviewDate: application.interviewDate ?? null,
          recruiterNotes: application.recruiterNotes ?? null,
          interviewScheduledAt: application.interviewScheduledAt ?? null,
          scorecardAverage: average(ratings),
          scorecardCount: applicationScorecards.length,
        };
      });

      const fitScores = applicationInsights
        .map((application) => application.fitScore)
        .filter((score): score is number => score !== null);
      const poolEntry = poolByCandidate.get(profile.id);
      const skills = (profile.skills ?? [])
        .map((skill) => ({ id: skill.id, name: skill.name }))
        .sort((left, right) => left.name.localeCompare(right.name));

      return {
        id: profile.id,
        userId: profile.userId,
        headline: profile.headline ?? null,
        bio: profile.bio ?? null,
        phone: profile.phone ?? null,
        location: profile.location ?? null,
        resumeUrl: profile.resumeUrl ?? null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: { id: user.id, name: user.name, email: user.email },
        skills,
        poolEntry: poolEntry ? this.serializePoolEntry(poolEntry) : null,
        metrics: {
          applicationCount: applicationInsights.length,
          bestFitScore: fitScores.length > 0 ? Math.max(...fitScores) : null,
          scorecardAverage: average(candidateRatings),
        },
        applicationInsights,
        applicationResumes: applicationInsights
          .filter(
            (application) =>
              application.resumeDownloadUrl &&
              application.resumeOriginalFilename,
          )
          .map((application) => ({
            applicationId: application.applicationId,
            jobId: application.jobId,
            jobTitle: application.jobTitle,
            resumeOriginalFilename: application.resumeOriginalFilename,
            resumeUploadedAt: application.resumeUploadedAt,
            parsedYearsExperience: application.parsedYearsExperience,
            parsedSkills: application.parsedSkills,
            resumeDownloadUrl: application.resumeDownloadUrl,
          })),
      };
    });
  }

  async listCandidates(companyId: string, filters: RecruiterCandidateFilters) {
    const candidates = await this.loadCandidates(companyId);
    const search = filters.search?.toLocaleLowerCase();
    const skill = filters.skill?.toLocaleLowerCase();

    return candidates
      .filter((candidate) => {
        if (
          search &&
          ![
            candidate.user.name,
            candidate.user.email,
            candidate.headline,
            candidate.location,
          ].some((value) => value?.toLocaleLowerCase().includes(search))
        ) {
          return false;
        }
        if (
          filters.tagId &&
          !candidate.poolEntry?.tags.some((tag) => tag.id === filters.tagId)
        ) {
          return false;
        }
        if (
          skill &&
          !candidate.skills.some((item) =>
            item.name.toLocaleLowerCase().includes(skill),
          )
        ) {
          return false;
        }
        if (filters.poolStatus === "in_pool" && !candidate.poolEntry) {
          return false;
        }
        if (filters.poolStatus === "not_in_pool" && candidate.poolEntry) {
          return false;
        }

        const fitScores = candidate.applicationInsights
          .map((application) => application.fitScore)
          .filter((score): score is number => score !== null);
        if (
          filters.minFitScore !== undefined &&
          !fitScores.some(
            (score) =>
              score >= filters.minFitScore! &&
              (filters.maxFitScore === undefined ||
                score <= filters.maxFitScore),
          )
        ) {
          return false;
        }
        if (
          filters.maxFitScore !== undefined &&
          filters.minFitScore === undefined &&
          !fitScores.some((score) => score <= filters.maxFitScore!)
        ) {
          return false;
        }

        const scorecardAverage = candidate.metrics.scorecardAverage;
        if (
          filters.minScorecardAverage !== undefined &&
          (scorecardAverage === null ||
            scorecardAverage < filters.minScorecardAverage)
        ) {
          return false;
        }
        if (
          filters.maxScorecardAverage !== undefined &&
          (scorecardAverage === null ||
            scorecardAverage > filters.maxScorecardAverage)
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (Boolean(left.poolEntry) !== Boolean(right.poolEntry)) {
          return left.poolEntry ? -1 : 1;
        }
        return left.user.name.localeCompare(right.user.name);
      });
  }

  async getCandidate(companyId: string, candidateId: string) {
    const [candidate] = await this.loadCandidates(companyId, candidateId);
    if (!candidate) {
      throw createError("Candidate profile not found", 404);
    }
    return candidate;
  }

  async listTags(companyId: string) {
    return CandidateTag.findAll({
      where: { companyId },
      attributes: ["id", "label"],
      order: [["label", "ASC"]],
    });
  }

  async createTag(companyId: string, label: string) {
    const existing = await CandidateTag.findOne({
      where: {
        companyId,
        [Op.and]: sqlWhere(fn("LOWER", col("label")), label.toLocaleLowerCase()),
      },
    });
    if (existing) {
      throw createError("A tag with this label already exists", 409);
    }

    try {
      return await CandidateTag.create({ companyId, label });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw createError("A tag with this label already exists", 409);
      }
      throw error;
    }
  }

  async deleteTag(companyId: string, tagId: string): Promise<void> {
    const deleted = await CandidateTag.destroy({
      where: { id: tagId, companyId },
    });
    if (deleted === 0) {
      throw createError("Tag not found", 404);
    }
  }

  async addToPool(
    companyId: string,
    candidateId: string,
    recruiterId: string,
    input: PoolInput,
  ) {
    return getSequelize().transaction(async (transaction) => {
      if (!(await this.hasAppliedToCompany(companyId, candidateId, transaction))) {
        throw createError(
          "Candidate has never applied to your company",
          422,
        );
      }

      const [entry, created] = await CandidatePoolEntry.findOrCreate({
        where: { companyId, candidateId },
        defaults: {
          companyId,
          candidateId,
          addedBy: recruiterId,
          notes: input.notes ?? null,
        },
        transaction,
      });

      if (!created && input.notes !== undefined) {
        await entry.update({ notes: input.notes }, { transaction });
      }
      if (input.tagIds !== undefined) {
        await this.replaceTags(entry.id, companyId, input.tagIds, transaction);
      }

      const loaded = await this.loadPoolEntry(companyId, candidateId, transaction);
      return { entry: this.serializePoolEntry(loaded!), created };
    });
  }

  async updatePool(
    companyId: string,
    candidateId: string,
    input: PoolInput,
  ) {
    return getSequelize().transaction(async (transaction) => {
      const entry = await CandidatePoolEntry.findOne({
        where: { companyId, candidateId },
        transaction,
      });
      if (!entry) {
        throw createError("Candidate is not in your talent pool", 404);
      }

      if (input.notes !== undefined) {
        await entry.update({ notes: input.notes }, { transaction });
      }
      if (input.tagIds !== undefined) {
        await this.replaceTags(entry.id, companyId, input.tagIds, transaction);
      }

      const loaded = await this.loadPoolEntry(companyId, candidateId, transaction);
      return this.serializePoolEntry(loaded!);
    });
  }

  async removeFromPool(companyId: string, candidateId: string): Promise<void> {
    const deleted = await CandidatePoolEntry.destroy({
      where: { companyId, candidateId },
    });
    if (deleted === 0) {
      throw createError("Candidate is not in your talent pool", 404);
    }
  }

  async inviteCandidate(
    companyId: string,
    candidateId: string,
    jobId: string,
  ) {
    if (!(await this.hasAppliedToCompany(companyId, candidateId))) {
      throw createError("Candidate has never applied to your company", 422);
    }

    const job = await Job.findOne({ where: { id: jobId, companyId } });
    if (!job) {
      throw createError("Job not found", 404);
    }
    if (job.status !== "OPEN") {
      throw createError("This job is no longer open", 409);
    }

    const existingApplication = await Application.findOne({
      where: { jobId, candidateProfileId: candidateId },
    });
    if (existingApplication) {
      throw createError("Candidate has already applied to this job", 409);
    }

    return notificationService.recordCandidateInvite(candidateId, job);
  }
}

export const talentPoolService = new TalentPoolService();
