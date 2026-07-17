import type { Request, Response, NextFunction } from "express";
import { companyService } from "../services/company.service";

export const companyController = {
  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const company = await companyService.create(req.body);

      res.status(201).json({
        data: company,
      });
    } catch (err) {
      next(err);
    }
  },async update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const company = await companyService.update(
      req.params.id,
      req.body,
    );

    res.json({
      data: company,
    });
  } catch (err) {
    next(err);
  }
}
};
