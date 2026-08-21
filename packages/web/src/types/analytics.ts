/** Stages that form the forward funnel. REJECTED is an exit, not a step. */
export type FunnelStage =
  | "APPLIED"
  | "REVIEWED"
  | "INTERVIEWING"
  | "OFFER"
  | "HIRED";

export interface FunnelStageStats {
  stage: FunnelStage;
  /** Applications sitting in this stage right now. */
  count: number;
  /** Applications that reached this stage or moved past it. */
  reached: number;
  reachedPercentage: number;
  /** Share of the previous stage that reached this one; null for the first. */
  conversionFromPrevious: number | null;
  rejectedFrom?: number;
}

export interface RecruiterReportRecord {
  company: { id: string; name: string };
  range: { from: string; to: string };
  scope: { jobId: string | null };
  generatedAt: string;
  hasActivity: boolean;
  summary: {
    totalApplications: number;
    activeJobs: number;
    interviewsScheduled: number;
    offersMade: number;
    hires: number;
  };
  funnel: RecruiterAnalyticsRecord["funnel"] & {
    unattributedRejections: number;
  };
  timeToHire: TimeToHireStats;
  scoreDistribution: ScoreDistributionStats;
  jobs: Array<{
    jobId: string;
    title: string;
    applications: number;
    stageSpread: Record<
      "APPLIED" | "REVIEWED" | "INTERVIEWING" | "OFFER" | "HIRED" | "REJECTED",
      number
    >;
    hires: number;
    averageFitScore: number | null;
  }>;
  scorecards: Array<{
    criterionId: string;
    label: string;
    ratings: number;
    averageRating: number;
  }>;
  applicationsOverTime: Array<{ period: string; applications: number }>;
  timingInterval: "day" | "week" | "month";
}

export interface RecruiterReportFilters {
  from: string;
  to: string;
  jobId?: string;
}

export interface TimeToHireStats {
  hiredCount: number;
  /** Null until at least one application has actually been hired. */
  averageDays: number | null;
  medianDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  trend: Array<{ month: string; hires: number; averageDays: number }>;
}

export interface ScoreBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface ScoreDistributionStats {
  buckets: ScoreBucket[];
  scoredCount: number;
  unscoredCount: number;
  averageScore: number | null;
  medianScore: number | null;
}

export interface RecruiterAnalyticsRecord {
  totalApplications: number;
  funnel: {
    stages: FunnelStageStats[];
    rejected: number;
    rejectedPercentage: number;
  };
  timeToHire: TimeToHireStats;
  scoreDistribution: ScoreDistributionStats;
}
