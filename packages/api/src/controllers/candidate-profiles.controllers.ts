import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { candidateProfileService }
  from "../services/candidate-profiles.service";
import { getCallerCompanyId } from "../lib/company-membership";

export const candidateProfileController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // userId is deliberately NOT read from req.body — a candidate can only
      // ever create a profile for themselves.
      const profile =
        await candidateProfileService.create({
          ...req.body,
          userId: req.user!.userId,
        });

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
    const companyId = await getCallerCompanyId(req);

    if (!companyId) {
      res.status(200).json({ data: [] });
      return;
    }

    const profiles =
      await candidateProfileService.getAll(companyId);

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
    const companyId = await getCallerCompanyId(req);

    if (!companyId) {
      res.status(404).json({ error: "Candidate profile not found" });
      return;
    }

    const profile =
      await candidateProfileService.getById(
        req.params.id as string,
        companyId,
      );

    res.status(200).json({
      data: profile,
    });
  } catch (err) {
    next(err);
  }
}
};