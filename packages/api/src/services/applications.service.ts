import {
  Application,
  CandidateProfile,
  Job,
  User,
} from "@starter-kit/shared/db";

import type { ApplicationStage } from "@starter-kit/shared/db";

import { createError } from "../middleware/error-handler";
import { InterviewAssignment } from "@starter-kit/shared/db";

export class ApplicationService {
  async create(input: {
    jobId: string;
    candidateProfileId: string;
    coverLetter?: string;
  }) {
    const job = await Job.findByPk(input.jobId);

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

    const existingApplication = await Application.findOne({
      where: {
        jobId: input.jobId,
        candidateProfileId: input.candidateProfileId,
      },
    });

    if (existingApplication) {
      throw createError(
        "You have already applied for this job",
        400,
      );
    }

    const application = await Application.create({
      ...input,
      stage: "APPLIED",
      submittedAt: new Date(),
      resumeUrl: profile.resumeUrl,
    });

    return application;
  }
  async getByJob(jobId: string) {
    return Application.findAll({
      where: {
        jobId,
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
  id: string,
  stage: ApplicationStage,
){
  const application = await Application.findByPk(id);

  if (!application) {
    throw createError("Application not found", 404);
  }

  await application.update({ stage });

  return application;
}
async assignInterviewer(
  applicationId: string,
  interviewerId: string,
) {
  const application =
    await Application.findByPk(applicationId);

  if (!application) {
    throw createError(
      "Application not found",
      404,
    );
  }

  const interviewer =
    await User.findByPk(interviewerId);

  if (!interviewer) {
    throw createError(
      "Interviewer not found",
      404,
    );
  }

  if (interviewer.role !== "INTERVIEWER") {
    throw createError(
      "User is not an interviewer",
      400,
    );
  }

  return InterviewAssignment.create({
    applicationId,
    interviewerId,
  });
}
};

export const applicationService =
  new ApplicationService();