export type PlatformRole = "candidate" | "recruiter" | "interviewer";

/**
 * Roles the backend can return today are only "admin" and "user".
 * PlatformRole values are frontend product roles until backend support ships.
 */
export type UserRole = PlatformRole | "admin" | "user";

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
