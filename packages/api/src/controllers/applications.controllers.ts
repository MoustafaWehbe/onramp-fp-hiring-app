import type {
  Request,
  Response,
  NextFunction,
} from "express";

import type {
  Application,
  CandidateProfile,
} from "@starter-kit/shared/db";
import { applicationService } from "../services/applications.service";
import { getCallerCompanyId } from "../lib/company-membership";
import { createError } from "../middleware/error-handler";

export const applicationController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // candidateProfileId is deliberately NOT read from req.body — it comes
      // from the caller's own profile (attached by ownCandidateProfileGuard)
      // so a candidate can only ever apply as themselves.
      const candidateProfile = res.locals.candidateProfile as CandidateProfile;

      const result = await applicationService.create({
        ...req.body,
        candidateProfileId: candidateProfile.id,
      });

      res.status(result.created ? 201 : 200).json({
        data: result.application,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMine(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const candidateProfile = res.locals.candidateProfile as CandidateProfile;
      const applications = await applicationService.getMine(
        candidateProfile.id,
      );

      res.status(200).json({
        data: applications,
      });
    } catch (err) {
      next(err);
    }
  },

  async getByJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const applications =
        await applicationService.getByJob(
          req.params.jobId as string,
        );

      res.status(200).json({
        data: applications,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateStage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const application = await applicationService.updateStage(
        res.locals.application as Application,
        req.body.stage,
      );

      res.status(200).json({
        data: application,
      });
    } catch (err) {
      next(err);
    }
  },

  async assignInterviewer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);

      if (!companyId) {
        throw createError("Application not found", 404);
      }

      const assignment = await applicationService.assignInterviewer(
        res.locals.application as Application,
        req.body.interviewerId,
        companyId,
      );

      res.status(200).json({
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  },
};
