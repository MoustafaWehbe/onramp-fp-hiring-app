import {
  Application,
  CandidateProfile,
  InterviewAssignment,
  Job,
  User,
} from "@starter-kit/shared/db";
import { Op } from "sequelize";

type ProfileWithUser = CandidateProfile & { user?: User };
type ApplicationWithRelations = Application & {
  job?: Job;
  candidateProfile?: ProfileWithUser;
};
type AssignmentWithApplication = InterviewAssignment & {
  application?: ApplicationWithRelations;
};

export class InterviewerService {
  async getAssignments(interviewerId: string) {
    const assignments = await InterviewAssignment.findAll({
      attributes: ["id", "createdAt"],
      where: { interviewerId },
      include: [
        {
          model: Application,
          as: "application",
          attributes: [
            "id",
            "stage",
            "submittedAt",
            "coverLetter",
            "resumeUrl",
          ],
          where: {
            stage: { [Op.ne]: "DRAFT" },
          },
          required: true,
          include: [
            {
              model: Job,
              as: "job",
              attributes: ["id", "title", "location", "status"],
              required: true,
            },
            {
              model: CandidateProfile,
              as: "candidateProfile",
              attributes: [
                "id",
                "headline",
                "location",
                "resumeUrl",
              ],
              required: true,
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "name", "email"],
                  required: true,
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return assignments.map((assignment) => {
      const related = assignment as AssignmentWithApplication;
      const application = related.application!;
      const job = application.job!;
      const candidateProfile = application.candidateProfile!;
      const user = candidateProfile.user!;

      return {
        id: assignment.id,
        createdAt: assignment.createdAt,
        application: {
          id: application.id,
          stage: application.stage,
          submittedAt: application.submittedAt ?? null,
          coverLetter: application.coverLetter ?? null,
          resumeUrl: application.resumeUrl ?? null,
          job: {
            id: job.id,
            title: job.title,
            location: job.location ?? null,
            status: job.status,
          },
          candidateProfile: {
            id: candidateProfile.id,
            headline: candidateProfile.headline ?? null,
            location: candidateProfile.location ?? null,
            resumeUrl: candidateProfile.resumeUrl ?? null,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          },
        },
      };
    });
  }
}

export const interviewerService = new InterviewerService();
