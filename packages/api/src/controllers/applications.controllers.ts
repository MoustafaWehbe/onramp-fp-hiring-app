import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { applicationService }
  from "../services/applications.service";
export const applicationController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const application =
        await applicationService.create(req.body);

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