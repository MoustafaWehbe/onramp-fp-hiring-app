import {
  Application,
  ApplicationStageHistory,
  CandidateProfile,
  Company,
  Job,
} from "@starter-kit/shared/db";
import type { ApplicationStage } from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

type ApplicationWithRelations = Application & {
  candidateProfile?: CandidateProfile;
  job?: Job & { company?: Company };
};

/**
 * The candidate's view of their own application's progress.
 *
 * What it returns is as important as what it omits: no fitScore, aiSummary,
 * aiStrengths, aiGaps, or recruiterNotes ever appear here. Those are the
 * recruiter's working notes on a person, and every prior phase has kept them
 * off candidate-facing responses. The serialization below is an allowlist
 * built field by field, not a model dump with deletions, so a column added
 * later cannot leak by default.
 */
export class ApplicationTimelineService {
  async getForCandidate(applicationId: string, userId: string) {
    const application = (await Application.findByPk(applicationId, {
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
          attributes: ["id", "title"],
          required: true,
          include: [
            {
              model: Company,
              as: "company",
              attributes: ["id", "name"],
              required: true,
            },
          ],
        },
      ],
    })) as ApplicationWithRelations | null;

    if (!application) {
      throw createError("Application not found", 404);
    }

    if (application.candidateProfile?.userId !== userId) {
      throw createError("Application not found", 404);
    }

    const history = await ApplicationStageHistory.findAll({
      attributes: ["id", "fromStage", "toStage", "changedAt"],
      where: { applicationId },
      order: [
        ["changedAt", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    const entries = history.map((row) => ({
      id: row.id,
      fromStage: row.fromStage ?? null,
      toStage: row.toStage,
      changedAt: row.changedAt,
      // Deliberately not exposing changedBy: which recruiter moved a card is
      // internal, and the candidate's question is "where am I", not "who".
    }));

    const latestRecorded = entries.at(-1)?.toStage ?? null;

    return {
      applicationId: application.id,
      jobTitle: application.job?.title ?? "Job application",
      companyName: application.job?.company?.name ?? null,
      currentStage: application.stage,
      submittedAt: application.submittedAt ?? null,
      interviewDate: application.interviewDate ?? null,
      googleMeetLink: application.googleMeetLink ?? null,
      entries,
      /**
       * True when the application reached its current stage before history
       * was recorded, so the UI can say history starts here instead of
       * implying the candidate never moved.
       */
      hasCompleteHistory:
        entries.length > 0 && latestRecorded === application.stage,
    };
  }

  /** The stages a candidate is shown, in order, for rendering a progress rail. */
  candidateVisibleStages(): ApplicationStage[] {
    return ["APPLIED", "REVIEWED", "INTERVIEWING", "OFFER", "HIRED"];
  }
}

export const applicationTimelineService = new ApplicationTimelineService();
