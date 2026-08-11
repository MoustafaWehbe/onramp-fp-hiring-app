import type { ScorecardSummary } from "./scorecards";
import type { CalendarSyncStatus } from "./calendar";

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
 * Application shape returned by the recruiter-scoped endpoints. The AI and
 * interview fields are withheld from candidate-facing responses, so they only
 * appear here.
 */
export interface RecruiterApplicationRecord extends SubmittedApplication {
  fitScore: number | null;
  aiSummary: string | null;
  aiStrengths: string[];
  aiGaps: string[];
  aiScoredAt: string | null;
  aiScoringStatus: AIScoringStatus;
  interviewDate: string | null;
  recruiterNotes: string | null;
  interviewScheduledAt: string | null;
  googleMeetLink: string | null;
  calendarSyncStatus: CalendarSyncStatus;
}

/**
 * Shape returned by GET /applications/job/:jobId, which additionally includes
 * the candidate profile and only the safe identity fields selected for its
 * nested user.
 */
export interface RecruiterPipelineApplication
  extends RecruiterApplicationRecord {
  stage: RecruiterApplicationStage;
  /**
   * Aggregate of the interview scorecards submitted for this application,
   * computed server-side so the board does not fetch per card.
   */
  scorecardSummary?: ScorecardSummary;
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
  /** Omit to leave any existing date untouched; null clears it. */
  interviewDate?: string | null;
}

/**
 * Both fields are independently optional: an omitted key leaves the stored
 * value alone, an explicit null clears it.
 */
export interface UpdateApplicationInterviewInput {
  applicationId: string;
  /** Used to invalidate the pipeline this application belongs to. */
  jobId: string;
  candidateProfileId?: string;
  interviewDate?: string | null;
  recruiterNotes?: string | null;
}

export interface RescoreApplicationInput {
  applicationId: string;
  jobId: string;
}
