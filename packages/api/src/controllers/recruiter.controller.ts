import type { NextFunction, Request, Response } from "express";
import { getCallerCompanyId } from "../lib/company-membership";
import { recruiterService } from "../services/recruiter.service";

export const recruiterController = {
  async dashboard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);
      const dashboard = companyId
        ? await recruiterService.getDashboard(companyId)
        : recruiterService.emptyDashboard();

      res.status(200).json({ data: dashboard });
    } catch (err) {
      next(err);
    }
  },
};
