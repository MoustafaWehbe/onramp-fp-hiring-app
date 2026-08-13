import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { skillService } from "../services/skills.service";

export const skillController = {
  async search(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const skills = await skillService.search(req.query.q as string);

      res.json({ data: skills });
    } catch (err) {
      next(err);
    }
  },

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { skill, created } = await skillService.create(req.body);

      res.status(created ? 201 : 200).json({
        data: skill,
      });
    } catch (err) {
      next(err);
    }
  },
};
