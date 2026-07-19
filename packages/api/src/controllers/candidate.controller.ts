import type { Request, Response, NextFunction } from "express";
import type { CandidateProfile, WorkExperience } from "@starter-kit/shared/db";
import { candidateService } from "../services/candidate.service";
import { storageProvider } from "../lib/storage";
import { resumeStorageKey } from "../lib/resume-upload";
import { createError } from "../middleware/error-handler";

export const candidateController = {
  // ─── Profile ─────────────────────────────────────────────────────────────
  // GET/PATCH rely on ownershipGuard(profile) having already loaded (and
  // 404'd on) res.locals.profile — see routes/candidate.routes.ts.

  getProfile(req: Request, res: Response): void {
    res.json({ data: res.locals.profile as CandidateProfile });
  },

  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await candidateService.createProfile(
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await candidateService.updateProfile(
        res.locals.profile as CandidateProfile,
        req.body,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  // ─── Work experience ────────────────────────────────────────────────────

  async listExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const experience = await candidateService.listExperience(req.user!.userId);
      res.json({ data: experience });
    } catch (err) {
      next(err);
    }
  },

  async createExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const experience = await candidateService.createExperience(
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: experience });
    } catch (err) {
      next(err);
    }
  },

  // PATCH/DELETE rely on ownershipGuard(experience) having loaded (and
  // 404'd on) res.locals.experience.

  async updateExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await candidateService.updateExperience(
        res.locals.experience as WorkExperience,
        req.body,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async deleteExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await candidateService.deleteExperience(res.locals.experience as WorkExperience);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // ─── Skills ──────────────────────────────────────────────────────────────

  async getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await candidateService.getSkills(req.user!.userId);
      res.json({ data: skills });
    } catch (err) {
      next(err);
    }
  },

  async listSkillCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await candidateService.listSkillCatalog();
      res.json({ data: skills });
    } catch (err) {
      next(err);
    }
  },

  async setSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await candidateService.setSkills(
        req.user!.userId,
        req.body.skillIds,
      );
      res.json({ data: skills });
    } catch (err) {
      next(err);
    }
  },

  // ─── Resume ──────────────────────────────────────────────────────────────

  async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw createError("A resume file is required", 422);
      }

      const key = resumeStorageKey(req.user!.userId, req.file.mimetype);
      const upload = await storageProvider.upload(key, req.file.buffer, req.file.mimetype);
      const profile = await candidateService.attachResume(req.user!.userId, upload);

      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  },
};
