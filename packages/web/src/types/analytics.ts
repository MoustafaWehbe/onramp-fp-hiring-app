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
