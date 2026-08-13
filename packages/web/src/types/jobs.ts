import type { SkillOption } from "./skills";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type RecruiterJobStatus = "DRAFT" | "OPEN" | "CLOSED";
export type EditableJobStatus = Extract<
  RecruiterJobStatus,
  "DRAFT" | "OPEN"
>;

export type JobSkillRecord = SkillOption;

/**
 * Safe public shape returned by GET /api/jobs/public and
 * GET /api/jobs/public/:id.
 */
export interface PublicJobRecord {
  id: string;
  title: string;
  description: string;
  location: string | null;
  status: "OPEN";
  createdAt: string;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  company: {
    id: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
  };
  skills: JobSkillRecord[];
}

/** Company-scoped job shape returned by the recruiter GET /api/jobs list. */
export interface RecruiterJobRecord {
  id: string;
  companyId: string;
  createdById: string;
  title: string;
  description: string;
  location: string | null;
  status: RecruiterJobStatus;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: JobSkillRecord[];
  applicantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecruiterJobInput {
  title: string;
  description: string;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  location?: string;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: string[];
  status: RecruiterJobStatus;
}

export type RecruiterJobCreateInput = Omit<
  RecruiterJobInput,
  "status"
> & {
  status: EditableJobStatus;
};

/** Lean presentation shape shared by cards backed by the public jobs API. */
export interface JobSummary {
  id: string;
  company: string | null;
  /** Drives the link from a card to that company's careers page. */
  companyId: string | null;
  title: string;
  status: "open";
  location: string | null;
  employmentType: EmploymentType;
  experienceMin: number;
  experienceMax: number;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  skills: string[];
  postedAt: string;
}
