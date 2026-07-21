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
  async list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const jobs = await jobService.getAll();

    res.json({
      data: jobs,
    });
  } catch (err) {
    next(err);
  }
},
async getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
   const job = await jobService.getById(
  req.params.id as string,
    );

    res.json({
      data: job,
    });
  } catch (err) {
    next(err);
  }
},
async update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const job = await jobService.update(
  req.params.id as string,
  req.body,
);

    res.json({
      data: job,
    });
  } catch (err) {
    next(err);
  }
},
async delete(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await jobService.delete(
      req.params.id as string,
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
};