/** Mirrors packages/shared/db/models/CandidateProfile.ts. */
export interface CandidateProfileRecord {
  id: string;
  userId: string;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  resumeUrl?: string | null;
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
