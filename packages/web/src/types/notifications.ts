import type { AIScoringStatus, ApplicationStage } from "./applications";

export type NotificationType =
  | "new_application"
  | "stage_change"
  | "invite_to_apply";

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  relatedApplicationId: string | null;
  /** Null when the related application has since been removed. */
  relatedJobId: string | null;
  /** Null means unread. */
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: NotificationRecord[];
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ListNotificationsInput {
  limit?: number;
  offset?: number;
  status?: "all" | "read" | "unread";
}

/** Pushed on the SSE stream when a pipeline row changes. */
export interface RealtimeApplicationEvent {
  applicationId: string;
  jobId: string;
  stage: ApplicationStage;
  aiScoringStatus: AIScoringStatus;
  fitScore: number | null;
  interviewDate: string | null;
}
