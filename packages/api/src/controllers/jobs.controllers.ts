import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { jobService } from "../services/jobs.service";

export const jobController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const job = await jobService.create(req.body);

      res.status(201).json({
        data: job,
      });
    } catch (err) {
      next(err);
    }
  },
};