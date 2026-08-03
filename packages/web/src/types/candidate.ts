/** Mirrors packages/shared/db/models/CandidateProfile.ts. */
export interface CandidateProfileRecord {
  id: string;
  userId: string;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  resumeUrl?: string | null;
  links?: Record<string, string> | null;
  profilePhotoUrl?: string | null;
  /** Set once the one-time pre-fill from parsed resume data has run. */
  profileSeededAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors packages/shared/db/models/WorkExperience.ts. Dates are YYYY-MM-DD strings. */
export interface WorkExperienceRecord {
  id: string;
  candidateProfileId: string;
  company: string;
  title: string;
  startDate: string;
  /** Null/undefined = current role. */
  endDate?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors packages/shared/db/models/Skill.ts. */
export interface SkillRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInput {
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

export interface ExperienceInput {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export type ExperienceUpdateInput = Partial<ExperienceInput>;

/** Free-form label -> URL, as stored on the profile. */
export type ProfileLinks = Record<string, string>;

/** Mirrors packages/shared/db/models/CandidateEducation.ts. */
export interface EducationRecord {
  id: string;
  candidateProfileId: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  /** Null/undefined = still studying. */
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EducationInput {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
}

export type EducationUpdateInput = Partial<EducationInput>;

export interface ProfileExtrasInput {
  links?: ProfileLinks | null;
  profilePhotoUrl?: string | null;
}

/**
 * Why Easy Apply is or isn't offered. `missing` is phrased for display, so a
 * blocked candidate is told what to add rather than just refused.
 */
export interface EasyApplyReadiness {
  ready: boolean;
  hasResumeOnFile: boolean;
  hasProfileContent: boolean;
  missing: string[];
}

export interface JobRecommendation {
  jobId: string;
  score: number;
  reason: string | null;
  matchedSkills: string[];
  computedAt: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    isRemote: boolean;
    employmentType: string;
    salaryMin: number;
    salaryMax: number;
    salaryCurrency: string;
    skills: string[];
    company: { id: string; name: string; logoUrl: string | null } | null;
  } | null;
}

/**
 * `computing` means the background job is still scoring — a first visit, not
 * an error. `insufficient-profile` means there is too little to score at all.
 */
export interface RecommendationsResponse {
  status: "ready" | "computing" | "insufficient-profile";
  recommendations: JobRecommendation[];
}

/**
 * The candidate's own view of an application. Note what is absent: no
 * fitScore, aiSummary, aiStrengths, aiGaps, or recruiterNotes. The server
 * does not send them, and this type does not describe them, so the UI cannot
 * render them by accident.
 */
export interface ApplicationTimelineEntry {
  id: string;
  fromStage: string | null;
  toStage: string;
  changedAt: string;
}

export interface ApplicationTimeline {
  applicationId: string;
  jobTitle: string;
  companyName: string | null;
  currentStage: string;
  submittedAt: string | null;
  interviewDate: string | null;
  entries: ApplicationTimelineEntry[];
  /** False when the application moved stages before history was recorded. */
  hasCompleteHistory: boolean;
}
