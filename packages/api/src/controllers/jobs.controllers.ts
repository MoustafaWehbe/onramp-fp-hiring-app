import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { jobService } from "../services/jobs.service";
import { getCallerCompanyId } from "../lib/company-membership";
import { createError } from "../middleware/error-handler";

export const jobController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);

      if (!companyId) {
        throw createError(
          "You must belong to a company to create jobs",
          403,
        );
      }

      const job = await jobService.create({
        ...req.body,
        companyId,
        createdById: req.user!.userId,
      });

      res.status(201).json({
        data: job,
      });
    } catch (err) {
      next(err);
    }
  },
};