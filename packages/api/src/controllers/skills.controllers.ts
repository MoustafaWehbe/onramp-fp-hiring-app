import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { skillService } from "../services/skills.service";

export const skillController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const skill = await skillService.create(req.body);

      res.status(201).json({
        data: skill,
      });
    } catch (err) {
      next(err);
    }
  },
};