export type CalendarSyncStatus = "not_synced" | "synced" | "failed";

export interface RecruiterCalendarConnection {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  connectedAt: string | null;
}

export interface RecruiterCalendarInterview {
  applicationId: string;
  interviewDate: string;
  googleMeetLink: string | null;
  calendarSyncStatus: CalendarSyncStatus;
  job: { id: string; title: string };
  candidate: { id: string; name: string; email: string };
}
