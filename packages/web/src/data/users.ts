import type { CandidateProfile, PlatformRole, AuthUser } from "../types/users";

export const mockUsers: Record<PlatformRole, AuthUser> = {
  candidate: {
    id: "candidate-1",
    email: "candidate@example.com",
    name: "Avery Stone",
    role: "candidate",
  },
  recruiter: {
    id: "recruiter-1",
    email: "recruiter@example.com",
    name: "Maya Chen",
    role: "recruiter",
  },
  interviewer: {
    id: "interviewer-1",
    email: "interviewer@example.com",
    name: "Jordan Lee",
    role: "interviewer",
  },
};

/**
 * TEMPORARY frontend-only demo credentials for UX testing while the backend
 * has no candidate/recruiter/interviewer users. These are not real accounts
 * and never reach the API — see AuthProvider.login for the fallback logic.
 * Remove this block once backend role support ships.
 */
export const demoCredentials: Record<
  PlatformRole,
  { email: string; password: string }
> = {
  candidate: { email: "candidate@example.com", password: "Candidate1234!" },
  recruiter: { email: "recruiter@example.com", password: "Recruiter1234!" },
  interviewer: {
    email: "interviewer@example.com",
    password: "Interviewer1234!",
  },
};

export function findDemoRoleByCredentials(
  email: string,
  password: string,
): PlatformRole | null {
  const match = (Object.keys(demoCredentials) as PlatformRole[]).find(
    (role) =>
      demoCredentials[role].email === email.trim().toLowerCase() &&
      demoCredentials[role].password === password,
  );
  return match ?? null;
}

export const candidateProfile: CandidateProfile = {
  name: "Avery Stone",
  email: "candidate@example.com",
  headline: "Senior Frontend Engineer",
  location: "Remote, US time zones",
  summary:
    "Product-minded engineer focused on accessible React systems, clear UX, and high-trust collaboration with design and product teams.",
  skills: [
    "React",
    "TypeScript",
    "Design Systems",
    "Accessibility",
    "Product Strategy",
    "Tailwind CSS",
  ],
  experience: [
    {
      title: "Senior Frontend Engineer",
      company: "Northstar Labs",
      period: "2022 - Present",
      description:
        "Led the rebuild of a hiring analytics dashboard, improving task completion and reducing support escalations.",
    },
    {
      title: "Product Engineer",
      company: "Folio",
      period: "2019 - 2022",
      description:
        "Built responsive workflow tools for customer success teams and partnered closely with design on component systems.",
    },
  ],
  completion: 84,
};
