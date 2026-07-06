export type ApplicationStatus =
  | "Applied"
  | "Reviewing"
  | "Interviewing"
  | "Offer"
  | "Closed";

export interface Application {
  id: string;
  jobId: string;
  company: string;
  title: string;
  stage: string;
  status: ApplicationStatus;
  updatedAt: string;
}
