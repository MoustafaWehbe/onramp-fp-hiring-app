import {
  Application,
  CandidateProfile,
  Job,
  User,
  type ApplicationStage,
} from "@starter-kit/shared/db";
import { Op, col, fn } from "sequelize";

const SUBMITTED_STAGES = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const satisfies readonly ApplicationStage[];

type SubmittedStage = (typeof SUBMITTED_STAGES)[number];

type StageCountRow = {
  stage: SubmittedStage;
  count: string;
};

type ProfileWithUser = CandidateProfile & { user?: User };
type ApplicationWithRelations = Application & {
  job?: Job;
  candidateProfile?: ProfileWithUser;
};

function emptyStageCounts(): Record<SubmittedStage, number> {
  return Object.fromEntries(
    SUBMITTED_STAGES.map((stage) => [stage, 0]),
  ) as Record<SubmittedStage, number>;
}

export class RecruiterService {
  async getDashboard(companyId: string) {
    const [totalJobs, openJobs, stageRows, recentApplications] =
      await Promise.all([
        Job.count({ where: { companyId } }),
        Job.count({ where: { companyId, status: "OPEN" } }),
        Application.findAll({
          attributes: [
            "stage",
            [fn("COUNT", col("Application.id")), "count"],
          ],
          where: {
            stage: { [Op.ne]: "DRAFT" },
          },
          include: [
            {
              model: Job,
              as: "job",
              attributes: [],
              where: { companyId },
              required: true,
            },
          ],
          group: ["Application.stage"],
          raw: true,
        }) as unknown as Promise<StageCountRow[]>,
        Application.findAll({
          attributes: [
            "id",
            "jobId",
            "stage",
            "submittedAt",
            "createdAt",
          ],
          where: {
            stage: { [Op.ne]: "DRAFT" },
          },
          include: [
            {
              model: Job,
              as: "job",
              attributes: ["id", "title"],
              where: { companyId },
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
          order: [
            ["submittedAt", "DESC"],
            ["createdAt", "DESC"],
          ],
          limit: 5,
        }),
      ]);

    const stageCounts = emptyStageCounts();

    for (const row of stageRows) {
      if (row.stage in stageCounts) {
        stageCounts[row.stage] = Number(row.count);
      }
    }

    const totalApplications = Object.values(stageCounts).reduce(
      (total, count) => total + count,
      0,
    );

    return {
      metrics: {
        totalJobs,
        openJobs,
        totalApplications,
        interviewing: stageCounts.INTERVIEWING,
        offers: stageCounts.OFFER,
        hires: stageCounts.HIRED,
      },
      stageCounts,
      recentApplicants: recentApplications.map((application) => {
        const related = application as ApplicationWithRelations;
        const job = related.job!;
        const candidateProfile = related.candidateProfile!;
        const user = candidateProfile.user!;

        return {
          id: application.id,
          jobId: application.jobId,
          jobTitle: job.title,
          stage: application.stage,
          submittedAt: application.submittedAt ?? null,
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
        };
      }),
    };
  }

  emptyDashboard() {
    const stageCounts = emptyStageCounts();

    return {
      metrics: {
        totalJobs: 0,
        openJobs: 0,
        totalApplications: 0,
        interviewing: 0,
        offers: 0,
        hires: 0,
      },
      stageCounts,
      recentApplicants: [],
    };
  }
}

export const recruiterService = new RecruiterService();
