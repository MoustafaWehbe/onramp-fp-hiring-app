import {
  Application,
  Company,
  Job,
  JobSkill,
  Skill,
  User,
  getSequelize,
  type EmploymentType,
  type JobStatus,
} from "@starter-kit/shared/db";
import {
  Op,
  col,
  fn,
  type Transaction,
} from "sequelize";
import { isCompanyProfileComplete } from "./company.service";
import { createError } from "../middleware/error-handler";
import { calendarService } from "./calendar.service";
import { skillService } from "./skills.service";

interface JobFields {
  title: string;
  description: string;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  location?: string;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: string[];
  status: JobStatus;
}

interface CreateJobInput extends JobFields {
  companyId: string;
  createdById: string;
  status: Extract<JobStatus, "DRAFT" | "OPEN">;
}

type JobUpdateInput = Partial<JobFields>;

type ApplicantCountRow = {
  jobId: string;
  applicantCount: string;
};

export class JobService {
  private serializeSkills(job: Job) {
    const skills = (job.get("skills") as Skill[] | undefined) ?? [];

    return skills
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private serializeStructuredFields(job: Job, includeUpdatedAt = true) {
    const fields = {
      id: job.id,
      title: job.title,
      description: job.description,
      employmentType: job.employmentType,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      location: job.location ?? null,
      isRemote: job.isRemote,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      status: job.status,
      createdAt: job.createdAt,
      skills: this.serializeSkills(job),
    };

    return includeUpdatedAt
      ? { ...fields, updatedAt: job.updatedAt }
      : fields;
  }

  private serializePublic(job: Job) {
    const company = job.get("company") as Company | undefined;

    return {
      ...this.serializeStructuredFields(job, false),
      company: company
        ? {
            id: company.id,
            name: company.name,
            website: company.website ?? null,
            logoUrl: company.logoUrl ?? null,
          }
        : null,
    };
  }

  private serializeRecruiter(job: Job, applicantCount: number) {
    return {
      ...this.serializeStructuredFields(job),
      companyId: job.companyId,
      createdById: job.createdById,
      applicantCount,
    };
  }

  private validateJobState(input: {
    experienceMin: number;
    experienceMax: number;
    salaryMin: number;
    salaryMax: number;
    isRemote: boolean;
    location?: string;
  }) {
    if (input.experienceMax < input.experienceMin) {
      throw createError(
        "experienceMax must be greater than or equal to experienceMin",
        422,
      );
    }

    if (input.salaryMax < input.salaryMin) {
      throw createError(
        "salaryMax must be greater than or equal to salaryMin",
        422,
      );
    }

    if (!input.isRemote && !input.location?.trim()) {
      throw createError(
        "location is required when isRemote is false",
        422,
      );
    }
  }

  private async resolveSkills(
    names: string[],
    transaction: Transaction,
  ): Promise<Skill[]> {
    const skills: Skill[] = [];
    const orderedNames = [...names].sort((left, right) =>
      left.toLocaleLowerCase().localeCompare(right.toLocaleLowerCase()),
    );

    // Stable lock ordering prevents two concurrent multi-skill saves from
    // deadlocking when they contain the same names in a different order.
    for (const name of orderedNames) {
      const { skill } = await skillService.findOrCreateByName(name, transaction);
      skills.push(skill);
    }

    return skills;
  }

  private async replaceSkills(
    jobId: string,
    names: string[],
    transaction: Transaction,
  ): Promise<void> {
    const skills = await this.resolveSkills(names, transaction);

    await JobSkill.destroy({ where: { jobId }, transaction });
    await JobSkill.bulkCreate(
      skills.map((skill) => ({
        jobId,
        skillId: skill.id,
      })),
      { transaction },
    );
  }

  private async loadWithSkills(
    id: string,
    transaction?: Transaction,
  ): Promise<Job> {
    const job = await Job.findByPk(id, {
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      transaction,
    });

    if (!job) {
      throw createError("Job not found", 404);
    }

    return job;
  }

  private async getApplicantCounts(jobIds: string[]) {
    if (jobIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = (await Application.findAll({
      attributes: [
        "jobId",
        [fn("COUNT", col("id")), "applicantCount"],
      ],
      where: {
        jobId: { [Op.in]: jobIds },
        stage: { [Op.ne]: "DRAFT" },
      },
      group: ["jobId"],
      raw: true,
    })) as unknown as ApplicantCountRow[];

    return new Map(
      rows.map((row) => [row.jobId, Number(row.applicantCount)]),
    );
  }

  async create(input: CreateJobInput) {
    const company = await Company.findByPk(input.companyId);

    if (!company) {
      throw createError("Company not found", 404);
    }

    if (!isCompanyProfileComplete(company)) {
      throw createError(
        "Complete your company profile before creating a job",
        409,
      );
    }

    const user = await User.findByPk(input.createdById);

    if (!user) {
      throw createError("User not found", 404);
    }

    if (user.companyId !== company.id) {
      throw createError("Company not found", 404);
    }

    this.validateJobState(input);

    const { skills, ...jobFields } = input;
    const jobId = await getSequelize().transaction(async (transaction) => {
      const job = await Job.create(jobFields, { transaction });
      await this.replaceSkills(job.id, skills, transaction);
      return job.id;
    });

    const job = await this.loadWithSkills(jobId);
    return this.serializeRecruiter(job, 0);
  }

  async getAll(companyId: string) {
    const jobs = await Job.findAll({
      where: { companyId },
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const counts = await this.getApplicantCounts(jobs.map((job) => job.id));

    return jobs.map((job) =>
      this.serializeRecruiter(job, counts.get(job.id) ?? 0),
    );
  }

  async getRecruiterById(id: string) {
    const job = await this.loadWithSkills(id);
    const counts = await this.getApplicantCounts([id]);
    return this.serializeRecruiter(job, counts.get(id) ?? 0);
  }

  /**
   * Every publicly-visible job listing goes through here — the browse page and
   * a company's careers page alike — so there is one definition of "a job the
   * public may see" and one public field allow-list to keep correct.
   */
  async getPublic(filter: { companyId?: string } = {}) {
    const jobs = await Job.findAll({
      attributes: [
        "id",
        "title",
        "description",
        "employmentType",
        "experienceMin",
        "experienceMax",
        "location",
        "isRemote",
        "salaryMin",
        "salaryMax",
        "salaryCurrency",
        "status",
        "createdAt",
        "updatedAt",
      ],
      where: {
        status: "OPEN",
        ...(filter.companyId ? { companyId: filter.companyId } : {}),
      },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name", "website", "logoUrl"],
          required: true,
        },
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return jobs.map((job) => this.serializePublic(job));
  }

  async getPublicById(id: string) {
    const job = await Job.findOne({
      attributes: [
        "id",
        "title",
        "description",
        "employmentType",
        "experienceMin",
        "experienceMax",
        "location",
        "isRemote",
        "salaryMin",
        "salaryMax",
        "salaryCurrency",
        "status",
        "createdAt",
        "updatedAt",
      ],
      where: {
        id,
        status: "OPEN",
      },
      include: [
        {
          model: Company,
          as: "company",
          attributes: ["id", "name", "website", "logoUrl"],
          required: true,
        },
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!job) {
      throw createError("Job not found", 404);
    }

    return this.serializePublic(job);
  }

  async update(job: Job, input: JobUpdateInput) {
    const previousStatus = job.status;
    const nextRanges = {
      experienceMin: input.experienceMin ?? job.experienceMin,
      experienceMax: input.experienceMax ?? job.experienceMax,
      salaryMin: input.salaryMin ?? job.salaryMin,
      salaryMax: input.salaryMax ?? job.salaryMax,
      isRemote: input.isRemote ?? job.isRemote,
      location: input.location ?? job.location,
    };
    this.validateJobState(nextRanges);

    const { skills, ...jobFields } = input;

    await getSequelize().transaction(async (transaction) => {
      await job.update(jobFields, { transaction });

      if (skills) {
        await this.replaceSkills(job.id, skills, transaction);
      }
    });

    if (previousStatus !== "CLOSED" && job.status === "CLOSED") {
      await calendarService.cancelForClosedJob(job.id);
    }

    return this.getRecruiterById(job.id);
  }

  async delete(job: Job) {
    await job.destroy();
  }
}

export const jobService = new JobService();
