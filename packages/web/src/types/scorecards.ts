/** Fixed for this phase — every criterion is scored on the same 1-5 scale. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export interface ScorecardCriterion {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface ScorecardTemplate {
  id: string;
  title: string;
  createdAt: string;
  criteria: ScorecardCriterion[];
}

/** A criterion on the way to the server: no id means "create this one". */
export interface ScorecardCriterionInput {
  id?: string;
  label: string;
  description?: string | null;
}

export interface ScorecardTemplateInput {
  title: string;
  criteria: ScorecardCriterionInput[];
}

export interface StarterCriterion {
  label: string;
  description: string;
}

export interface ScorecardTemplateList {
  templates: ScorecardTemplate[];
  /**
   * A suggested starting point for a company with no templates. Nothing is
   * stored until the recruiter submits it — see the backend note on
   * listForCompany for why this is not auto-created.
   */
  starterCriteria: StarterCriterion[];
}

export interface ScorecardRating {
  criterionId: string;
  criterionLabel: string;
  rating: number;
  comment: string | null;
}

export interface InterviewScorecard {
  id: string;
  interviewerId: string;
  interviewerName: string;
  /** The caller's own submission — the only one they can overwrite. */
  isMine: boolean;
  templateId: string;
  templateTitle: string;
  overallComment: string | null;
  submittedAt: string;
  /** Null only if the scorecard somehow carries no ratings. */
  averageRating: number | null;
  ratings: ScorecardRating[];
}

export interface CriterionAverage {
  criterionId: string;
  criterionLabel: string;
  averageRating: number;
  ratingCount: number;
}

export interface ScorecardAggregate {
  scorecardCount: number;
  /** Null when nobody has submitted — never 0, which would read as a score. */
  overallAverage: number | null;
  criteriaAverages: CriterionAverage[];
  scorecards: InterviewScorecard[];
}

export interface SubmitScorecardInput {
  applicationId: string;
  templateId: string;
  overallComment?: string | null;
  ratings: {
    criterionId: string;
    rating: number;
    comment?: string | null;
  }[];
}

/** Headline numbers only, carried on each pipeline card. */
export interface ScorecardSummary {
  scorecardCount: number;
  averageRating: number | null;
}
