import type { Request, Response, NextFunction } from "express";
import {
  scorecardTemplatesService,
  STARTER_CRITERIA,
} from "../services/scorecard-templates.service";
import { getCallerCompanyId } from "../lib/company-membership";
import { createError } from "../middleware/error-handler";
import { serializeTemplate } from "../lib/scorecard-serializers";

/**
 * A recruiter with no company yet cannot own templates. This is the same gate
 * job creation sits behind, surfaced here as a 409 the frontend turns into
 * "set up your company profile first".
 */
async function requireCompanyId(req: Request): Promise<string> {
  const companyId = await getCallerCompanyId(req);

  if (!companyId) {
    throw createError(
      "Complete your company profile before creating scorecard templates",
      409,
    );
  }

  return companyId;
}

export const scorecardTemplateController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = await requireCompanyId(req);
      const templates =
        await scorecardTemplatesService.listForCompany(companyId);

      res.json({
        data: {
          templates: templates.map(serializeTemplate),
          // Shipped alongside the list so the frontend can offer a prefilled
          // starter form without hard-coding the criteria itself. It is a
          // suggestion, not a saved template — nothing exists until the
          // recruiter submits it.
          starterCriteria: STARTER_CRITERIA,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = await requireCompanyId(req);
      const template = await scorecardTemplatesService.create(
        companyId,
        req.user!.userId,
        req.body,
      );

      res.status(201).json({ data: serializeTemplate(template) });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await scorecardTemplatesService.update(
        req.params.id as string,
        req.body,
      );

      res.json({ data: serializeTemplate(template) });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await scorecardTemplatesService.remove(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
