import type {
  Request,
  Response,
  NextFunction,
} from "express";

import type { CandidateProfile } from "@starter-kit/shared/db";
import { applicationService }
  from "../services/applications.service";
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

      const application =
        await applicationService.create({
          ...req.body,
          candidateProfileId: candidateProfile.id,
        });

      res.status(201).json({
        data: application,
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
    const application =
      await applicationService.updateStage(
        req.params.id as string,
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
    const assignment =
      await applicationService.assignInterviewer(
        req.params.id as string,
        req.body.interviewerId,
      );

    res.status(200).json({
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
}
};