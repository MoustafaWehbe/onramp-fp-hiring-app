import { Application, CandidateProfile, Job, Skill } from "@starter-kit/shared/db";
import {
  reviewResumeForJob,
  isResumeReviewConfigured,
  InsufficientResumeContentError,
  type ResumeReviewResult,
} from "@starter-kit/shared/ai";
import { createError } from "../middleware/error-handler";
import { extractResumeText } from "./application-resume.service";
import { easyApplyService } from "./easy-apply.service";

type JobWithSkills = Job & { skills?: Skill[] };

/**
 * Resolves "the candidate's resume" for a review without ever writing
 * anything to storage or the database — a freshly uploaded file is parsed
 * in memory and discarded, and the result of the review itself is returned
 * to the caller and nowhere else. It lives only in the frontend's state for
 * that page visit.
 */
export class ResumeReviewService {
  private async resolveResumeText(
    userId: string,
    jobId: string,
    file?: Express.Multer.File,
  ): Promise<string> {
    if (file) {
      try {
        return await extractResumeText(file.buffer, file.mimetype);
      } catch {
        throw createError("Couldn't read text from that CV", 422);
      }
    }

    const profile = await CandidateProfile.findOne({ where: { userId } });

    if (!profile) {
      throw createError(
        "Create your candidate profile before requesting an AI review",
        404,
      );
    }

    // Prefer whatever resume is already attached to this application (an
    // upload for this job, or an Easy Apply snapshot) so the review reflects
    // exactly what was — or would be — submitted, not a stale standing
    // profile.
    const application = await Application.findOne({
      where: { jobId, candidateProfileId: profile.id },
    });

    if (application?.resumeText) {
      return application.resumeText;
    }

    const profileWithRelations = await easyApplyService.loadProfile(userId);
    const snapshot = easyApplyService.buildProfileSnapshot(profileWithRelations);

    if (!snapshot.resumeText.trim()) {
      throw new InsufficientResumeContentError();
    }

    return snapshot.resumeText;
  }

  async review(
    userId: string,
    jobId: string,
    file?: Express.Multer.File,
  ): Promise<ResumeReviewResult> {
    if (!isResumeReviewConfigured()) {
      throw createError("AI resume review is not configured", 503);
    }

    const job = (await Job.findByPk(jobId, {
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["name"],
          through: { attributes: [] },
          required: false,
        },
      ],
    })) as JobWithSkills | null;

    if (!job) {
      throw createError("Job not found", 404);
    }

    const resumeText = await this.resolveResumeText(userId, jobId, file);

    try {
      return await reviewResumeForJob({
        job: {
          title: job.title,
          description: job.description,
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
          requiredSkills: job.skills?.map((skill) => skill.name) ?? [],
        },
        resume: { text: resumeText },
      });
    } catch (error) {
      if (error instanceof InsufficientResumeContentError) {
        throw createError(error.message, 422);
      }

      const detail = error instanceof Error ? error.message : String(error);
      console.error(`[resume-review] AI review failed: ${detail}`);
      throw createError(
        "Couldn't generate an AI review right now. Try again shortly.",
        502,
      );
    }
  }
}

export const resumeReviewService = new ResumeReviewService();
