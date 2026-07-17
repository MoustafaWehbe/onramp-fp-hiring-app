import {
  Job,
  Skill,
  JobSkill,
} from "@starter-kit/shared/db";

import { createError } from "../middleware/error-handler";

export class JobSkillService {
  async attachSkills(
    jobId: string,
    skillIds: string[],
  ) {
    const job = await Job.findByPk(jobId);

    if (!job) {
      throw createError("Job not found", 404);
    }

    const skills = await Skill.findAll({
      where: {
        id: skillIds,
      },
    });

    if (skills.length !== skillIds.length) {
      throw createError(
        "One or more skills not found",
        404,
      );
    }

    await Promise.all(
      skillIds.map((skillId) =>
        JobSkill.findOrCreate({
          where: {
            jobId,
            skillId,
          },
        }),
      ),
    );

    return {
      jobId,
      skillIds,
    };
  }
}

export const jobSkillService =
  new JobSkillService();