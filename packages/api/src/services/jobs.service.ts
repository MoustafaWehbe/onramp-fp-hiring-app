import { Company, Job, User } from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

export class JobService {
  async create(input: {
    companyId: string;
    createdById: string;
    title: string;
    description: string;
    location?: string;
  }) {
    const company = await Company.findByPk(input.companyId);

    if (!company) {
      throw createError("Company not found", 404);
    }

    const user = await User.findByPk(input.createdById);

    if (!user) {
      throw createError("User not found", 404);
    }

    const job = await Job.create(input);

    return {
      id: job.id,
      companyId: job.companyId,
      createdById: job.createdById,
      title: job.title,
      description: job.description,
      location: job.location,
      status: job.status,
    };
  }
}

export const jobService = new JobService();