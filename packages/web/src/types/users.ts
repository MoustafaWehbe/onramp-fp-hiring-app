export type PlatformRole = "candidate" | "recruiter" | "interviewer";

/**
 * Canonical backend roles (mirrors UserRole in packages/shared/auth/types.ts).
 * PlatformRole is the frontend's lowercase product-role vocabulary;
 * normalizeRole() in lib/roles.ts maps between the two.
 */
export type UserRole = "ADMIN" | "RECRUITER" | "INTERVIEWER" | "CANDIDATE";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CandidateProfile {
  name: string;
  email: string;
  headline: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  completion: number;
}
