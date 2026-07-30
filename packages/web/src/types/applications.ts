export type ApplicationStage =
  | "DRAFT"
  | "APPLIED"
  | "REVIEWED"
  | "INTERVIEWING"
  | "OFFER"
  | "HIRED"
  | "REJECTED";

export interface CandidateApplication {
  id: string;
  jobId: string;
  stage: ApplicationStage;
  coverLetter: string | null;
  resumeUrl: string | null;
  resumeOriginalFilename?: string | null;
  resumeUploadedAt?: string | null;
  parsedYearsExperience?: number | null;
  parsedSkills?: string[] | null;
  resumeDownloadUrl?: string | null;
  resumeParseSucceeded?: boolean | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    description: string;
    location: string | null;
    status: "DRAFT" | "OPEN" | "CLOSED";
    createdAt: string;
    company: {
      id: string;
      name: string;
      website: string | null;
      logoUrl: string | null;
    };
  };
}

export interface ApplicationSubmission {
  jobId: string;
  coverLetter?: string;
  resumeFile?: File;
  onUploadProgress?: (percentage: number) => void;
}

export interface ReplaceApplicationResumeInput {
  applicationId: string;
  file: File;
  onUploadProgress?: (percentage: number) => void;
}

/** Response returned when a draft is submitted or a new application is made. */
export interface SubmittedApplication {
  id: string;
  jobId: string;
  candidateProfileId: string;
  stage: ApplicationStage;
  coverLetter: string | null;
  resumeUrl: string | null;
  resumeOriginalFilename?: string | null;
  resumeUploadedAt?: string | null;
  parsedYearsExperience?: number | null;
  parsedSkills?: string[] | null;
  resumeDownloadUrl?: string | null;
  resumeParseSucceeded?: boolean | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RecruiterApplicationStage = Exclude<ApplicationStage, "DRAFT">;

export type RecruiterMutableApplicationStage = Exclude<
  RecruiterApplicationStage,
  "APPLIED"
>;

export type AIScoringStatus = "pending" | "completed" | "failed";

/**
 * Application shape returned by GET /applications/job/:jobId. The recruiter
 * endpoint includes the candidate profile and only the safe identity fields
 * selected for its nested user.
 */
export interface RecruiterPipelineApplication {
  id: string;
  jobId: string;
  candidateProfileId: string;
  stage: RecruiterApplicationStage;
  coverLetter: string | null;
  resumeUrl: string | null;
  resumeOriginalFilename?: string | null;
  resumeUploadedAt?: string | null;
  parsedYearsExperience?: number | null;
  parsedSkills?: string[] | null;
  resumeDownloadUrl?: string | null;
  resumeParseSucceeded?: boolean | null;
  fitScore: number | null;
  aiSummary: string | null;
  aiStrengths: string[];
  aiGaps: string[];
  aiScoredAt: string | null;
  aiScoringStatus: AIScoringStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  candidateProfile: {
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
  };
}

export interface UpdateApplicationStageInput {
  applicationId: string;
  jobId: string;
  stage: RecruiterMutableApplicationStage;
}

export interface RescoreApplicationInput {
  applicationId: string;
  jobId: string;
}
