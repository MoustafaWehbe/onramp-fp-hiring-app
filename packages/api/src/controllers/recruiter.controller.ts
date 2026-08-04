import type { NextFunction, Request, Response } from "express";
import { getCallerCompanyId } from "../lib/company-membership";
import { recruiterAnalyticsService } from "../services/recruiter-analytics.service";
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

  async analytics(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // A recruiter with no company yet gets a well-formed empty result
      // rather than a 404, so the dashboard renders its empty state instead
      // of an error card.
      const companyId = await getCallerCompanyId(req);
      const analytics = companyId
        ? await recruiterAnalyticsService.getAnalytics(companyId)
        : recruiterAnalyticsService.emptyAnalytics();

      res.status(200).json({ data: analytics });
    } catch (err) {
      next(err);
    }
  },
};
