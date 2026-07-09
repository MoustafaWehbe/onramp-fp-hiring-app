import type { FeedbackStatus } from "./pipeline";

export type InterviewStatus = "Scheduled" | "Completed" | "Needs feedback";

export interface Interview {
  id: string;
  candidateName: string;
  role: string;
  date: string;
  time: string;
  interviewType: string;
  status: InterviewStatus;
  feedbackStatus: FeedbackStatus;
}
