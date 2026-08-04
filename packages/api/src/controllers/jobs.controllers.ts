import type {
  Request,
  Response,
  NextFunction,
} from "express";
import type { Job } from "@starter-kit/shared/db";

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
      const companyId = await getCallerCompanyId(req);

      if (!companyId) {
        res.status(200).json({ data: [] });
        return;
      }

      const jobs = await jobService.getAll(companyId);

      res.json({
        data: jobs,
      });
    } catch (err) {
      next(err);
    }
  },

  async listPublic(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const jobs = await jobService.getPublic();

      res.json({
        data: jobs,
      });
    } catch (err) {
      next(err);
    }
  },

  async getPublicById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const job = await jobService.getPublicById(req.params.id as string);

      res.json({
        data: job,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const job = await jobService.getRecruiterById(
        (res.locals.job as Job).id,
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
        res.locals.job as Job,
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
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await jobService.delete(res.locals.job as Job);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
