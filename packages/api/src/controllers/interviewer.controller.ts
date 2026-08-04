import type { NextFunction, Request, Response } from "express";
import { interviewerService } from "../services/interviewer.service";

export const interviewerController = {
  async getMyAssignments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const assignments = await interviewerService.getAssignments(
        req.user!.userId,
      );

      res.status(200).json({ data: assignments });
    } catch (err) {
      next(err);
    }
  },
};
