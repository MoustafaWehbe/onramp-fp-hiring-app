import type { Request, Response, NextFunction } from "express";
import type { Company } from "@starter-kit/shared/db";
import { companyService } from "../services/company.service";
import { getCallerCompanyId } from "../lib/company-membership";

export const companyController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const company = await companyService.create(
        req.body,
        req.user!.userId,
      );

      res.status(201).json({
        data: company,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);
      const company = await companyService.getForCaller(companyId);

      res.status(200).json({
        data: company,
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
      const company = res.locals.company
        ? companyService.serialize(res.locals.company as Company)
        : await companyService.getById(req.params.id as string);

      res.status(200).json({
        data: company,
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
      const company = await companyService.update(
        req.params.id as string,
        req.body,
      );

      res.json({
        data: company,
      });
    } catch (err) {
      next(err);
    }
  },
};
