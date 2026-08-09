import type {
  AIScoringStatus,
  RecruiterApplicationStage,
} from "./applications";

export interface CandidateTagRecord {
  id: string;
  label: string;
}

export interface CandidatePoolEntryRecord {
  id: string;
  notes: string | null;
  addedAt: string;
  addedBy: string | null;
  tags: CandidateTagRecord[];
}

export interface RecruiterCandidateFilters {
  search?: string;
  tagId?: string;
  skill?: string;
  minFitScore?: number;
  maxFitScore?: number;
  minScorecardAverage?: number;
  maxScorecardAverage?: number;
  poolStatus?: "all" | "in_pool" | "not_in_pool";
}

export interface CandidatePoolInput {
  notes?: string | null;
  tagIds?: string[];
}

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
  skills?: Array<{ id: string; name: string }>;
  poolEntry?: CandidatePoolEntryRecord | null;
  metrics?: {
    applicationCount: number;
    bestFitScore: number | null;
    scorecardAverage: number | null;
  };
  applicationResumes?: Array<{
    applicationId: string;
    jobId: string;
    jobTitle: string;
    resumeOriginalFilename: string;
    resumeUploadedAt: string | null;
    parsedYearsExperience: number | null;
    parsedSkills: string[];
    resumeDownloadUrl: string;
  }>;
  applicationInsights?: Array<{
    applicationId: string;
    jobId: string;
    jobTitle: string;
    jobStatus?: "DRAFT" | "OPEN" | "CLOSED";
    stage: RecruiterApplicationStage;
    submittedAt?: string;
    resumeOriginalFilename: string | null;
    resumeUploadedAt: string | null;
    parsedYearsExperience: number | null;
    parsedSkills: string[];
    resumeDownloadUrl: string | null;
    fitScore: number | null;
    aiSummary: string | null;
    aiStrengths: string[];
    aiGaps: string[];
    aiScoredAt: string | null;
    aiScoringStatus: AIScoringStatus;
    interviewDate: string | null;
    recruiterNotes: string | null;
    interviewScheduledAt: string | null;
    scorecardAverage?: number | null;
    scorecardCount?: number;
  }>;
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
