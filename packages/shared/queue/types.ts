// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: "email",
  EMBEDDINGS: "embeddings",
  APPLICATION_FIT_SCORE: "application-fit-score",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job data shapes ───────────────────────────────────────────────────────────
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  variables?: Record<string, string>;
}

export interface EmbeddingsJobData {
  entityId: string;
  entityType: string;
  text: string;
}

export interface ApplicationFitScoreJobData {
  applicationId: string;
  /** Guards against a stale job overwriting a score after CV replacement. */
  resumeUploadedAt: string | null;
}

export type JobData =
  | EmailJobData
  | EmbeddingsJobData
  | ApplicationFitScoreJobData;

// ─── Job result shapes ─────────────────────────────────────────────────────────
export interface EmailJobResult {
  messageId: string;
}

export interface EmbeddingsJobResult {
  dimensions: number;
}

export interface ApplicationFitScoreJobResult {
  status: "completed" | "failed" | "stale";
  fitScore?: number;
}
