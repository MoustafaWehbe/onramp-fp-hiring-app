import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { candidateProfileService }
  from "../services/candidate-profiles.service";

export const candidateProfileController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile =
        await candidateProfileService.create(
          req.body,
        );

      res.status(201).json({
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  },
  async getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profiles =
      await candidateProfileService.getAll();

    res.status(200).json({
      data: profiles,
    });
  } catch (err) {
    next(err);
  }
},
async getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile =
      await candidateProfileService.getById(
        req.params.id,
      );

    res.status(200).json({
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}
};