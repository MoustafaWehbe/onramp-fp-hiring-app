export type PlatformRole = "candidate" | "recruiter" | "interviewer";

export type UserRole = PlatformRole | "admin";

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
