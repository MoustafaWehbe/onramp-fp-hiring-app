import {
  Application,
  CandidateProfile,
  Job,
  User,
} from "@starter-kit/shared/db";
import { Op } from "sequelize";

import { createError } from "../middleware/error-handler";

export class CandidateProfileService {
  async create(input: {
    userId: string;
    headline?: string;
    bio?: string;
    phone?: string;
    location?: string;
    resumeUrl?: string;
  }) {
    const user = await User.findByPk(input.userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    return CandidateProfile.create(input);
  }

  // Recruiters/admins only see candidates who submitted to their company.
  async getAll(companyId: string) {
    const applications = await Application.findAll({
      attributes: ["candidateProfileId"],
      where: {
        stage: { [Op.ne]: "DRAFT" },
      },
      include: [
        { model: Job, as: "job", attributes: [], where: { companyId } },
      ],
    });
    const profileIds = [
      ...new Set(applications.map((application) => application.candidateProfileId)),
    ];

    if (profileIds.length === 0) {
      return [];
    }

    return CandidateProfile.findAll({
      where: { id: profileIds },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });
  }

  async getById(id: string, companyId: string) {
    const profile = await CandidateProfile.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!profile) {
      throw createError("Candidate profile not found", 404);
    }

    const companyApplications = await Application.findAll({
      attributes: [
        "id",
        "jobId",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeUploadedAt",
        "parsedYearsExperience",
        "parsedSkills",
      ],
      where: {
        candidateProfileId: id,
        stage: { [Op.ne]: "DRAFT" },
      },
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["id", "title"],
          where: { companyId },
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    if (companyApplications.length === 0) {
      throw createError("Candidate profile not found", 404);
    }

    return {
      ...profile.toJSON(),
      applicationResumes: companyApplications
        .filter(
          (application) =>
            application.resumeFileUrl &&
            application.resumeOriginalFilename,
        )
        .map((application) => {
          const job = application.get("job") as Job | undefined;

          return {
            applicationId: application.id,
            jobId: application.jobId,
            jobTitle: job?.title ?? "Job application",
            resumeOriginalFilename: application.resumeOriginalFilename,
            resumeUploadedAt: application.resumeUploadedAt ?? null,
            parsedYearsExperience:
              application.parsedYearsExperience ?? null,
            parsedSkills: application.parsedSkills ?? [],
            resumeDownloadUrl: `/api/applications/${application.id}/resume`,
          };
        }),
    };
  }
}

export const candidateProfileService = new CandidateProfileService();
