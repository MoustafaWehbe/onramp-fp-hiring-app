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
import { applicationTimelineService } from "../services/application-timeline.service";
import { scorecardsService } from "../services/scorecards.service";
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

      const result = await applicationService.create(
        {
          ...req.body,
          candidateProfileId: candidateProfile.id,
        },
        req.file,
      );

      res.status(result.created ? 201 : 200).json({
        data: result.application,
      });
    } catch (err) {
      next(err);
    }
  },

  async replaceResume(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        throw createError("A PDF or DOCX CV is required", 422);
      }

      const application = await applicationService.replaceResume(
        req.params.id as string,
        req.user!.userId,
        req.file,
      );

      res.status(200).json({ data: application });
    } catch (err) {
      next(err);
    }
  },

  async downloadResume(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId =
        req.user?.role === "RECRUITER"
          ? await getCallerCompanyId(req)
          : undefined;
      const resume = await applicationService.getResume(
        req.params.id as string,
        {
          userId: req.user!.userId,
          role: req.user!.role,
          companyId,
        },
      );
      const encodedFilename = encodeURIComponent(resume.filename);

      res.setHeader("Content-Type", resume.contentType);
      res.setHeader("Content-Length", String(resume.body.length));
      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodedFilename}`,
      );
      res.status(200).send(resume.body);
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
        { interviewDate: req.body.interviewDate },
        req.user!.userId,
      );

      res.status(200).json({
        data: application,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateInterview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const application = await applicationService.updateInterview(
        res.locals.application as Application,
        {
          interviewDate: req.body.interviewDate,
          recruiterNotes: req.body.recruiterNotes,
        },
      );

      res.status(200).json({
        data: application,
      });
    } catch (err) {
      next(err);
    }
  },

  async timeline(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const timeline = await applicationTimelineService.getForCandidate(
        req.params.id as string,
        req.user!.userId,
      );

      res.status(200).json({ data: timeline });
    } catch (err) {
      next(err);
    }
  },

  async rescore(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const application = await applicationService.rescore(
        res.locals.application as Application,
      );

      res.status(202).json({ data: application });
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

  /**
   * PUT /applications/:id/scorecard — upsert the caller's own scorecard.
   *
   * PUT rather than POST because the caller can only ever address one
   * resource here: their scorecard for this application. Sending it twice
   * leaves the same single row, which is the semantics the unique index
   * enforces underneath.
   */
  async submitScorecard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = await getCallerCompanyId(req);

      if (!companyId) {
        throw createError("Application not found", 404);
      }

      const application = res.locals.application as Application;
      const scorecard = await scorecardsService.submit(
        application.id,
        req.user!.userId,
        companyId,
        req.body,
      );

      res.status(200).json({ data: scorecard });
    } catch (err) {
      next(err);
    }
  },

  async getScorecards(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const application = res.locals.application as Application;
      const aggregate = await scorecardsService.getAggregate(
        application.id,
        req.user!.userId,
      );

      res.status(200).json({ data: aggregate });
    } catch (err) {
      next(err);
    }
  },
};
