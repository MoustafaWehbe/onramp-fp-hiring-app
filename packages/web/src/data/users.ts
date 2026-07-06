import type { CandidateProfile, PlatformRole, AuthUser, UserRole } from "../types/users";

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

export function normalizeRole(role: string | undefined): PlatformRole | null {
  if (role === "candidate" || role === "recruiter" || role === "interviewer") {
    return role;
  }

  if (role === "admin") {
    return "recruiter";
  }

  return null;
}

export function getRoleHomePath(role: UserRole | string | undefined): string {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "candidate") {
    return "/candidate";
  }

  if (normalizedRole === "recruiter") {
    return "/recruiter/dashboard";
  }

  if (normalizedRole === "interviewer") {
    return "/interviewer";
  }

  return "/";
}
