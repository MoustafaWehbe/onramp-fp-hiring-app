import type { NextFunction, Request, Response } from "express";
import { getCallerCompanyId } from "../lib/company-membership";
import { recruiterAnalyticsService } from "../services/recruiter-analytics.service";
import { recruiterService } from "../services/recruiter.service";
import { recruiterReportsService } from "../services/recruiter-reports.service";
import type { RecruiterReportQuery } from "../schemas/reports.schemas";

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

  async reports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);
      if (!companyId) {
        res.status(403).json({ error: "You must belong to a company to use this feature" });
        return;
      }

      const query = req.query as unknown as RecruiterReportQuery;
      const report = await recruiterReportsService.getReport(companyId, query);

      if (query.format === "csv") {
        const scope = query.jobId ? "job" : "company";
        res
          .status(200)
          .type("text/csv")
          .setHeader(
            "Content-Disposition",
            `attachment; filename="hiring-report-${scope}-${query.from}-${query.to}.csv"`,
          )
          .send(recruiterReportsService.toCsv(report));
        return;
      }

      res.status(200).json({ data: report });
    } catch (err) {
      next(err);
    }
  },
};
