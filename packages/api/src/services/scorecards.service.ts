import {
  getSequelize,
  InterviewScorecard,
  ScorecardCriterion,
  ScorecardRating,
  ScorecardTemplate,
  User,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

interface RatingInput {
  criterionId: string;
  rating: number;
  comment?: string | null;
}

interface SubmitScorecardInput {
  templateId: string;
  ratings: RatingInput[];
  overallComment?: string | null;
}

export interface SerializedRating {
  criterionId: string;
  criterionLabel: string;
  rating: number;
  comment: string | null;
}

export interface SerializedScorecard {
  id: string;
  interviewerId: string;
  interviewerName: string;
  /**
   * Whether this is the caller's own submission — the only one they may
   * overwrite. Decided here rather than by the client comparing ids, because
   * the server is the one that actually knows who is asking.
   */
  isMine: boolean;
  templateId: string;
  templateTitle: string;
  overallComment: string | null;
  submittedAt: string;
  averageRating: number | null;
  ratings: SerializedRating[];
}

export interface CriterionAverage {
  criterionId: string;
  criterionLabel: string;
  averageRating: number;
  ratingCount: number;
}

export interface ScorecardAggregate {
  scorecardCount: number;
  /** Null rather than 0 when nobody has submitted — see averageOf. */
  overallAverage: number | null;
  criteriaAverages: CriterionAverage[];
  scorecards: SerializedScorecard[];
}

/**
 * Averages are reported to two decimals.
 *
 * The mean of integers is frequently something like 4.333333333333333, and
 * shipping that raw invites every consumer to round it differently. Two
 * decimals is past anything a 1-5 scale can distinguish and keeps float noise
 * out of the response.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Null for an empty set, never 0.
 *
 * A candidate nobody has scored has no average — reporting 0 would read as
 * "everyone rated them the worst possible", and would drag any further
 * aggregate down with it. Every caller has to handle the null.
 */
function averageOf(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

type ScorecardWithRelations = InterviewScorecard & {
  ratings?: (ScorecardRating & { criterion?: ScorecardCriterion })[];
  interviewer?: User;
  template?: ScorecardTemplate;
};

const scorecardIncludes = [
  {
    model: ScorecardRating,
    as: "ratings",
    include: [{ model: ScorecardCriterion, as: "criterion" }],
  },
  { model: User, as: "interviewer", attributes: ["id", "name"] },
  { model: ScorecardTemplate, as: "template", attributes: ["id", "title"] },
];

export class ScorecardsService {
  /**
   * Create or overwrite this interviewer's scorecard for this application.
   *
   * The unique index on (application_id, interviewer_id) makes "one scorecard
   * per interviewer" a fact about the data rather than a convention, so a
   * resubmission has to be an update. Ratings are replaced wholesale instead
   * of merged: a criterion the interviewer left out of the new submission is
   * one they no longer stand behind, and keeping the old value would report a
   * score they did not just give.
   */
  async submit(
    applicationId: string,
    interviewerId: string,
    companyId: string,
    input: SubmitScorecardInput,
  ): Promise<SerializedScorecard> {
    const template = await ScorecardTemplate.findByPk(input.templateId);

    // Scoping the template to the caller's company stops an application being
    // scored against another company's private criteria.
    if (!template || template.companyId !== companyId) {
      throw createError("Scorecard template not found", 404);
    }

    const criteria = await ScorecardCriterion.findAll({
      where: { templateId: template.id },
    });
    const criterionIds = new Set(criteria.map((criterion) => criterion.id));

    for (const rating of input.ratings) {
      if (!criterionIds.has(rating.criterionId)) {
        throw createError(
          "One of the ratings refers to a criterion outside this template",
          422,
        );
      }
    }

    // The unique index also covers (scorecard_id, criterion_id), but catching
    // duplicates here names the problem instead of surfacing a constraint
    // violation as a 500.
    const seen = new Set<string>();
    for (const rating of input.ratings) {
      if (seen.has(rating.criterionId)) {
        throw createError("A criterion was scored more than once", 422);
      }
      seen.add(rating.criterionId);
    }

    const scorecardId = await getSequelize().transaction(
      async (transaction) => {
        const existing = await InterviewScorecard.findOne({
          where: { applicationId, interviewerId },
          transaction,
        });

        const scorecard =
          existing ??
          (await InterviewScorecard.create(
            {
              applicationId,
              interviewerId,
              templateId: template.id,
              overallComment: input.overallComment ?? null,
              submittedAt: new Date(),
            },
            { transaction },
          ));

        if (existing) {
          await existing.update(
            {
              templateId: template.id,
              overallComment: input.overallComment ?? null,
              submittedAt: new Date(),
            },
            { transaction },
          );

          await ScorecardRating.destroy({
            where: { scorecardId: existing.id },
            transaction,
          });
        }

        await ScorecardRating.bulkCreate(
          input.ratings.map((rating) => ({
            scorecardId: scorecard.id,
            criterionId: rating.criterionId,
            rating: rating.rating,
            comment: rating.comment ?? null,
          })),
          { transaction },
        );

        return scorecard.id;
      },
    );

    const saved = (await InterviewScorecard.findByPk(scorecardId, {
      include: scorecardIncludes,
    })) as ScorecardWithRelations | null;

    return this.serializeScorecard(saved!, interviewerId);
  }

  /** Every submission for an application, plus the numbers computed from them. */
  async getAggregate(
    applicationId: string,
    callerId?: string,
  ): Promise<ScorecardAggregate> {
    const scorecards = (await InterviewScorecard.findAll({
      where: { applicationId },
      include: scorecardIncludes,
      order: [["submittedAt", "ASC"]],
    })) as ScorecardWithRelations[];

    const serialized = scorecards.map((scorecard) =>
      this.serializeScorecard(scorecard, callerId),
    );

    return {
      scorecardCount: serialized.length,
      overallAverage: averageOf(
        serialized.flatMap((scorecard) =>
          scorecard.ratings.map((rating) => rating.rating),
        ),
      ),
      criteriaAverages: this.criteriaAverages(serialized),
      scorecards: serialized,
    };
  }

  /** Just the headline numbers, for the pipeline badge. */
  async getSummaries(
    applicationIds: string[],
  ): Promise<Map<string, { scorecardCount: number; averageRating: number | null }>> {
    const summaries = new Map<
      string,
      { scorecardCount: number; averageRating: number | null }
    >();

    if (applicationIds.length === 0) {
      return summaries;
    }

    const scorecards = (await InterviewScorecard.findAll({
      where: { applicationId: applicationIds },
      include: [{ model: ScorecardRating, as: "ratings" }],
    })) as ScorecardWithRelations[];

    const byApplication = new Map<string, number[]>();
    const counts = new Map<string, number>();

    for (const scorecard of scorecards) {
      counts.set(
        scorecard.applicationId,
        (counts.get(scorecard.applicationId) ?? 0) + 1,
      );

      const ratings = byApplication.get(scorecard.applicationId) ?? [];
      ratings.push(...(scorecard.ratings ?? []).map((rating) => rating.rating));
      byApplication.set(scorecard.applicationId, ratings);
    }

    for (const applicationId of applicationIds) {
      summaries.set(applicationId, {
        scorecardCount: counts.get(applicationId) ?? 0,
        averageRating: averageOf(byApplication.get(applicationId) ?? []),
      });
    }

    return summaries;
  }

  /**
   * Per-criterion averages across every submission.
   *
   * Grouped by criterion id rather than by the active template's list, so a
   * criterion that has since been renamed still reports under the label its
   * ratings were given against, and scorecards submitted against an older
   * template still appear.
   */
  private criteriaAverages(
    scorecards: SerializedScorecard[],
  ): CriterionAverage[] {
    const grouped = new Map<
      string,
      { label: string; ratings: number[] }
    >();

    for (const scorecard of scorecards) {
      for (const rating of scorecard.ratings) {
        const entry = grouped.get(rating.criterionId) ?? {
          label: rating.criterionLabel,
          ratings: [],
        };
        entry.ratings.push(rating.rating);
        grouped.set(rating.criterionId, entry);
      }
    }

    return [...grouped.entries()].map(([criterionId, entry]) => ({
      criterionId,
      criterionLabel: entry.label,
      // Non-null by construction: a group only exists because it has ratings.
      averageRating: averageOf(entry.ratings)!,
      ratingCount: entry.ratings.length,
    }));
  }

  private serializeScorecard(
    scorecard: ScorecardWithRelations,
    callerId?: string,
  ): SerializedScorecard {
    const ratings = (scorecard.ratings ?? [])
      .map((rating) => ({
        criterionId: rating.criterionId,
        criterionLabel: rating.criterion?.label ?? "Removed criterion",
        sortOrder: rating.criterion?.sortOrder ?? 0,
        rating: rating.rating,
        comment: rating.comment ?? null,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder: _sortOrder, ...rating }) => rating);

    return {
      id: scorecard.id,
      interviewerId: scorecard.interviewerId,
      interviewerName: scorecard.interviewer?.name ?? "Unknown",
      isMine: callerId !== undefined && scorecard.interviewerId === callerId,
      templateId: scorecard.templateId,
      templateTitle: scorecard.template?.title ?? "Removed template",
      overallComment: scorecard.overallComment ?? null,
      submittedAt: scorecard.submittedAt.toISOString(),
      averageRating: averageOf(ratings.map((rating) => rating.rating)),
      ratings,
    };
  }
}

export const scorecardsService = new ScorecardsService();
