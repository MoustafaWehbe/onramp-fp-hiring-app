import type {
  RecruiterApplicationStage,
} from "./applications";

export interface RecruiterCandidateRecord {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  resumeUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RecruiterDashboardMetrics {
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  interviewing: number;
  offers: number;
  hires: number;
}

export interface RecruiterRecentApplicant {
  id: string;
  jobId: string;
  jobTitle: string;
  stage: RecruiterApplicationStage;
  submittedAt: string | null;
  candidateProfile: {
    id: string;
    headline: string | null;
    location: string | null;
    resumeUrl: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface RecruiterDashboardRecord {
  metrics: RecruiterDashboardMetrics;
  stageCounts: Record<RecruiterApplicationStage, number>;
  recentApplicants: RecruiterRecentApplicant[];
}
