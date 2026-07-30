import type { AIScoringStatus, ApplicationStage } from "../db";
import type { NotificationType } from "../db";

/**
 * Wire shape of a stored notification as it is pushed to a client. Mirrors the
 * REST representation so the frontend can drop it straight into the same
 * React Query cache without a second mapping.
 */
export interface RealtimeNotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  relatedApplicationId: string | null;
  relatedJobId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Enough for a recruiter's pipeline row to re-render without a refetch. */
export interface RealtimeApplicationPayload {
  applicationId: string;
  jobId: string;
  stage: ApplicationStage;
  aiScoringStatus: AIScoringStatus;
  fitScore: number | null;
  interviewDate: string | null;
}

export type RealtimeEvent =
  | { name: "notification"; payload: RealtimeNotificationPayload }
  | { name: "application.changed"; payload: RealtimeApplicationPayload };

/**
 * Recipients are resolved by the publisher, never by the delivering process.
 * Authorization therefore happens once, where the domain context (which
 * company owns the job, who owns the application) is already loaded.
 */
export interface RealtimeMessage {
  userIds: string[];
  event: RealtimeEvent;
}

export const REALTIME_CHANNEL = "realtime:events";

/**
 * Test runs share a Redis instance with development, so the channel carries
 * the same prefix the BullMQ queues use to stay isolated.
 */
export function getRealtimeChannel(): string {
  const prefix =
    process.env.BULLMQ_PREFIX ??
    (process.env.NODE_ENV === "test" ? "starter-kit-test" : "bull");
  return `${prefix}:${REALTIME_CHANNEL}`;
}
