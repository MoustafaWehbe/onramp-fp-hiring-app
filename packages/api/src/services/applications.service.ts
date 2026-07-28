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
import {
  applicationResumeService,
  resumeContentType,
  type StoredApplicationResume,
} from "./application-resume.service";

interface ResumeRequester {
  userId: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN" | "INTERVIEWER";
  companyId?: string | null;
}

type ResumeAccessApplication = Application & {
  candidateProfile?: CandidateProfile;
  job?: Job;
};

export class ApplicationService {
  private resumeAttributes(resume: StoredApplicationResume) {
    return {
      resumeFileUrl: resume.storageKey,
      resumeOriginalFilename: resume.originalFilename,
      resumeText: resume.text,
      parsedYearsExperience: resume.yearsExperience,
      parsedSkills: resume.skills,
      resumeUploadedAt: resume.uploadedAt,
    };
  }

  private serialize(application: Application) {
    const plain = application.toJSON() as unknown as Record<string, unknown>;
    const {
      resumeFileUrl,
      resumeText,
      ...safeApplication
    } = plain;

    return {
      ...safeApplication,
      resumeDownloadUrl:
        typeof resumeFileUrl === "string"
          ? `/api/applications/${application.id}/resume`
          : null,
      resumeParseSucceeded:
        typeof resumeFileUrl === "string" ? Boolean(resumeText) : null,
    };
  }

  async create(
    input: {
      jobId: string;
      candidateProfileId: string;
      coverLetter?: string;
    },
    file?: Express.Multer.File,
  ) {
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
      const storedResume = file
        ? await applicationResumeService.storeAndParse(profile.userId, file)
        : undefined;
      const previousStorageKey = existing.resumeFileUrl;

      try {
        const [updatedCount] = await Application.update(
          {
            stage: "APPLIED",
            coverLetter: input.coverLetter ?? existing.coverLetter,
            submittedAt: new Date(),
            resumeUrl: existing.resumeUrl ?? profile.resumeUrl,
            ...(storedResume ? this.resumeAttributes(storedResume) : {}),
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
      } catch (error) {
        if (storedResume) {
          await applicationResumeService.delete(storedResume.storageKey);
        }
        throw error;
      }

      if (
        storedResume &&
        previousStorageKey &&
        previousStorageKey !== storedResume.storageKey
      ) {
        await applicationResumeService.delete(previousStorageKey);
      }

      return {
        application: this.serialize(existing),
        created: false,
      };
    }

    if (existing) {
      throw createError(
        "You have already applied for this job",
        409,
      );
    }

    const storedResume = file
      ? await applicationResumeService.storeAndParse(profile.userId, file)
      : undefined;

    try {
      const application = await Application.create({
        ...input,
        stage: "APPLIED",
        submittedAt: new Date(),
        resumeUrl: profile.resumeUrl,
        ...(storedResume ? this.resumeAttributes(storedResume) : {}),
      });

      return {
        application: this.serialize(application),
        created: true,
      };
    } catch (err) {
      if (storedResume) {
        await applicationResumeService.delete(storedResume.storageKey);
      }

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
    const applications = await Application.findAll({
      attributes: [
        "id",
        "jobId",
        "stage",
        "coverLetter",
        "resumeUrl",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeText",
        "parsedYearsExperience",
        "parsedSkills",
        "resumeUploadedAt",
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

    return applications.map((application) => this.serialize(application));
  }

  async getByJob(jobId: string) {
    const applications = await Application.findAll({
      attributes: [
        "id",
        "jobId",
        "candidateProfileId",
        "stage",
        "coverLetter",
        "resumeUrl",
        "resumeFileUrl",
        "resumeOriginalFilename",
        "resumeText",
        "parsedYearsExperience",
        "parsedSkills",
        "resumeUploadedAt",
        "submittedAt",
        "createdAt",
        "updatedAt",
      ],
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

    return applications.map((application) => this.serialize(application));
  }

  async replaceResume(
    applicationId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const application = await Application.findByPk(applicationId, {
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
        },
      ],
    }) as ResumeAccessApplication | null;

    if (!application) {
      throw createError("Application not found", 404);
    }

    if (application.candidateProfile?.userId !== userId) {
      throw createError("You cannot replace this application's CV", 403);
    }

    const storedResume = await applicationResumeService.storeAndParse(
      userId,
      file,
    );
    const previousStorageKey = application.resumeFileUrl;

    try {
      await application.update(this.resumeAttributes(storedResume));
    } catch (error) {
      await applicationResumeService.delete(storedResume.storageKey);
      throw error;
    }

    if (
      previousStorageKey &&
      previousStorageKey !== storedResume.storageKey
    ) {
      await applicationResumeService.delete(previousStorageKey);
    }

    return this.serialize(application);
  }

  async getResume(applicationId: string, requester: ResumeRequester) {
    const application = await Application.findByPk(applicationId, {
      include: [
        {
          model: CandidateProfile,
          as: "candidateProfile",
          attributes: ["id", "userId"],
          required: true,
        },
        {
          model: Job,
          as: "job",
          attributes: ["id", "companyId"],
          required: true,
        },
      ],
    }) as ResumeAccessApplication | null;

    if (!application) {
      throw createError("Application not found", 404);
    }

    const candidateOwnsApplication =
      requester.role === "CANDIDATE" &&
      application.candidateProfile?.userId === requester.userId;
    const recruiterOwnsJob =
      requester.role === "RECRUITER" &&
      Boolean(requester.companyId) &&
      application.job?.companyId === requester.companyId;
    const adminAccess = requester.role === "ADMIN";

    if (!candidateOwnsApplication && !recruiterOwnsJob && !adminAccess) {
      throw createError("You cannot access this application's CV", 403);
    }

    if (!application.resumeFileUrl || !application.resumeOriginalFilename) {
      throw createError("Application CV not found", 404);
    }

    try {
      return {
        body: await applicationResumeService.read(application.resumeFileUrl),
        contentType: resumeContentType(application.resumeFileUrl),
        filename: application.resumeOriginalFilename,
      };
    } catch {
      throw createError("Application CV not found", 404);
    }
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

    return this.serialize(updated);
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
