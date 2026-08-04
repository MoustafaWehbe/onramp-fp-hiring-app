import type { NextFunction, Request, Response } from "express";
import type {
  CandidateEducation,
  CandidateProfile,
} from "@starter-kit/shared/db";
import { applicationService } from "../services/applications.service";
import { candidateEducationService } from "../services/candidate-education.service";
import { candidateProfileSeedService } from "../services/candidate-profile-seed.service";
import { candidateRecommendationsService } from "../services/candidate-recommendations.service";
import { easyApplyService } from "../services/easy-apply.service";

export const candidateProfileController = {
  async updateExtras(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile = res.locals.profile as CandidateProfile;
      const updated = await profile.update({
        ...(req.body.links === undefined ? {} : { links: req.body.links }),
        ...(req.body.profilePhotoUrl === undefined
          ? {}
          : { profilePhotoUrl: req.body.profilePhotoUrl }),
      });

      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Runs the one-time seed on demand, so the first visit to the profile page
   * shows parsed resume data without waiting for the next upload.
   */
  async seedFromResume(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const profile = res.locals.profile as CandidateProfile;
      const result = await candidateProfileSeedService.seedFromResume(
        profile.id,
      );

      await profile.reload();
      res.status(200).json({ data: { ...result, profile } });
    } catch (err) {
      next(err);
    }
  },

  async listEducation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const education = await candidateEducationService.list(req.user!.userId);
      res.status(200).json({ data: education });
    } catch (err) {
      next(err);
    }
  },

  async createEducation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const education = await candidateEducationService.create(
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ data: education });
    } catch (err) {
      next(err);
    }
  },

  async updateEducation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const education = await candidateEducationService.update(
        res.locals.education as CandidateEducation,
        req.body,
      );
      res.status(200).json({ data: education });
    } catch (err) {
      next(err);
    }
  },

  async deleteEducation(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      await candidateEducationService.remove(
        res.locals.education as CandidateEducation,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async easyApplyReadiness(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const readiness = await easyApplyService.getReadiness(req.user!.userId);
      res.status(200).json({ data: readiness });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Resolves the profile snapshot, then hands off to ApplicationService.create
   * so Easy Apply and the upload flow share one submission path — same stage
   * history, same fit-score scheduling, same recruiter notification.
   */
  async easyApply(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { profile, snapshot } = await easyApplyService.prepare(
        req.user!.userId,
        req.body.jobId,
      );

      const result = await applicationService.create({
        jobId: req.body.jobId,
        candidateProfileId: profile.id,
        coverLetter: req.body.coverLetter,
        profileSnapshot: snapshot,
      });

      res.status(result.created ? 201 : 200).json({
        data: result.application,
      });
    } catch (err) {
      next(err);
    }
  },

  async recommendations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await candidateRecommendationsService.list(
        req.user!.userId,
        req.query.limit as number | undefined,
      );

      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};
