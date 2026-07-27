import {
  Application,
  CandidateProfile,
  Company,
  InterviewAssignment,
  Job,
  User,
} from "@starter-kit/shared/db";
import type { ApplicationStage } from "@starter-kit/shared/db";
import { Op, UniqueConstraintError } from "sequelize";
import { createError } from "../middleware/error-handler";

export class ApplicationService {
  async create(input: {
    jobId: string;
    candidateProfileId: string;
    coverLetter?: string;
  }) {
    const job = await Job.findOne({
      where: {
        id: input.jobId,
        status: "OPEN",
      },
    });

    if (!job) {
      throw createError("Job not found", 404);
    }

    const profile = await CandidateProfile.findByPk(
      input.candidateProfileId,
    );

    if (!profile) {
      throw createError(
        "Candidate profile not found",
        404,
      );
    }

    const existing = await Application.findOne({
      where: {
        jobId: input.jobId,
        candidateProfileId: input.candidateProfileId,
      },
    });

    if (existing?.stage === "DRAFT") {
      const [updatedCount] = await Application.update(
        {
          stage: "APPLIED",
          coverLetter: input.coverLetter ?? existing.coverLetter,
          submittedAt: new Date(),
          resumeUrl: profile.resumeUrl,
        },
        {
          where: {
            id: existing.id,
            stage: "DRAFT",
          },
        },
      );

      if (updatedCount === 0) {
        throw createError(
          "You have already applied for this job",
          409,
        );
      }

      await existing.reload();

      return {
        application: existing,
        created: false,
      };
    }

    if (existing) {
      throw createError(
        "You have already applied for this job",
        409,
      );
    }

    try {
      const application = await Application.create({
        ...input,
        stage: "APPLIED",
        submittedAt: new Date(),
        resumeUrl: profile.resumeUrl,
      });

      return {
        application,
        created: true,
      };
    } catch (err) {
      // The unique index is the final authority under concurrent requests.
      if (err instanceof UniqueConstraintError) {
        throw createError(
          "You have already applied for this job",
          409,
        );
      }

      throw err;
    }
  }

  async getMine(candidateProfileId: string) {
    return Application.findAll({
      attributes: [
        "id",
        "jobId",
        "stage",
        "coverLetter",
        "resumeUrl",
        "submittedAt",
        "createdAt",
        "updatedAt",
      ],
      where: { candidateProfileId },
      include: [
        {
          model: Job,
          as: "job",
          attributes: [
            "id",
            "title",
            "description",
            "location",
            "status",
            "createdAt",
          ],
          required: true,
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name", "website", "logoUrl"],
              required: true,
            },
          ],
        },
      ],
      order: [
        ["updatedAt", "DESC"],
        ["createdAt", "DESC"],
        ["id", "ASC"],
      ],
    });
  }

  async getByJob(jobId: string) {
    return Application.findAll({
      where: {
        jobId,
        stage: { [Op.ne]: "DRAFT" },
      },
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          include: [
            {
              model: User,
              as: "user",
              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],
        },
      ],
    });
  }

  async updateStage(
    application: Application,
    stage: ApplicationStage,
  ) {
    await application.update({ stage });

    // The ownership guard loads a minimal job association. Reload without it
    // so ownership-only job metadata does not alter the response contract.
    const updated = await Application.findByPk(application.id);

    if (!updated) {
      throw createError("Application not found", 404);
    }

    return updated;
  }

  async assignInterviewer(
    application: Application,
    interviewerId: string,
    companyId: string,
  ) {
    const interviewer = await User.findOne({
      where: {
        id: interviewerId,
        role: "INTERVIEWER",
        companyId,
      },
    });

    if (!interviewer) {
      throw createError(
        "Interviewer not found",
        404,
      );
    }

    const [assignment] = await InterviewAssignment.findOrCreate({
      where: {
        applicationId: application.id,
        interviewerId,
      },
    });

    return assignment;
  }
}

export const applicationService = new ApplicationService();
