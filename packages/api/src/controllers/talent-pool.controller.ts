import type { NextFunction, Request, Response } from "express";
import { getCallerCompanyId } from "../lib/company-membership";
import { createError } from "../middleware/error-handler";
import type { RecruiterCandidateFilters } from "../schemas/talent-pool.schemas";
import { talentPoolService } from "../services/talent-pool.service";

async function requireCompanyId(req: Request): Promise<string> {
  const companyId = await getCallerCompanyId(req);
  if (!companyId) {
    throw createError("You must belong to a company to manage candidates", 403);
  }
  return companyId;
}

export const talentPoolController = {
  async listCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = await getCallerCompanyId(req);
      const candidates = companyId
        ? await talentPoolService.listCandidates(
            companyId,
            req.query as unknown as RecruiterCandidateFilters,
          )
        : [];
      res.status(200).json({ data: candidates });
    } catch (error) {
      next(error);
    }
  },

  async getCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await talentPoolService.getCandidate(
        await requireCompanyId(req),
        req.params.candidateId as string,
      );
      res.status(200).json({ data: candidate });
    } catch (error) {
      next(error);
    }
  },

  async listTags(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = await getCallerCompanyId(req);
      const tags = companyId ? await talentPoolService.listTags(companyId) : [];
      res.status(200).json({ data: tags });
    } catch (error) {
      next(error);
    }
  },

  async createTag(req: Request, res: Response, next: NextFunction) {
    try {
      const tag = await talentPoolService.createTag(
        await requireCompanyId(req),
        req.body.label,
      );
      res.status(201).json({ data: tag });
    } catch (error) {
      next(error);
    }
  },

  async deleteTag(req: Request, res: Response, next: NextFunction) {
    try {
      await talentPoolService.deleteTag(
        await requireCompanyId(req),
        req.params.tagId as string,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async addToPool(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await talentPoolService.addToPool(
        await requireCompanyId(req),
        req.params.candidateId as string,
        req.user!.userId,
        req.body,
      );
      res.status(result.created ? 201 : 200).json({ data: result.entry });
    } catch (error) {
      next(error);
    }
  },

  async updatePool(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await talentPoolService.updatePool(
        await requireCompanyId(req),
        req.params.candidateId as string,
        req.body,
      );
      res.status(200).json({ data: entry });
    } catch (error) {
      next(error);
    }
  },

  async removeFromPool(req: Request, res: Response, next: NextFunction) {
    try {
      await talentPoolService.removeFromPool(
        await requireCompanyId(req),
        req.params.candidateId as string,
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async invite(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await talentPoolService.inviteCandidate(
        await requireCompanyId(req),
        req.params.candidateId as string,
        req.body.jobId,
      );
      res.status(201).json({ data: notification });
    } catch (error) {
      next(error);
    }
  },
};
