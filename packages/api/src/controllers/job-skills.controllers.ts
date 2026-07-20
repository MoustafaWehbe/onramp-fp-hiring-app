import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { jobSkillService } from "../services/job-skills.service";

export const jobSkillController = {
  async attachSkills(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { jobId } = req.params;

const result =
  await jobSkillService.attachSkills(
    jobId as string,
    req.body.skillIds,
  );

      res.status(201).json({
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};