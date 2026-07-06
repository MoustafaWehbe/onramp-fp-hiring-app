export type PipelineStage =
  | "Applied"
  | "Screen"
  | "Technical"
  | "Final"
  | "Offer";

export type FeedbackStatus = "Pending" | "Submitted" | "Not started";

export interface CandidateLead {
  id: string;
  name: string;
  email: string;
  role: string;
  stage: PipelineStage;
  fitScore: number;
  skills: string[];
  source: string;
  feedbackStatus: FeedbackStatus;
}

export interface PipelineStageSummary {
  stage: PipelineStage;
  count: number;
}
