import type { PlatformRole } from "../types/users";

/**
 * Single source of truth for everything role-related on the frontend.
 *
 * Backend note: the API issues the canonical uppercase roles ADMIN /
 * RECRUITER / INTERVIEWER / CANDIDATE. The lowercase platform roles are the
 * frontend's product vocabulary — see normalizeRole() for the mapping.
 */

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "candidate",
  "recruiter",
  "interviewer",
] as const;

export interface RoleNavItem {
  to: string;
  label: string;
}

export interface RoleConfig {
  label: string;
  tagline: string;
  description: string;
  homePath: string;
  navItems: RoleNavItem[];
}

export const roleConfig: Record<PlatformRole, RoleConfig> = {
  candidate: {
    label: "Candidate",
    tagline: "Find roles worth your time",
    description:
      "Browse transparent roles, track applications, and keep your profile ready.",
    homePath: "/candidate",
    navItems: [
      { to: "/candidate", label: "Home" },
      { to: "/jobs", label: "Jobs" },
      { to: "/applications", label: "My applications" },
      { to: "/profile", label: "Profile" },
    ],
  },
  recruiter: {
    label: "Recruiter",
    tagline: "Review talent signals quickly",
    description:
      "Manage jobs, review applicants, and move candidates through a clear pipeline.",
    homePath: "/recruiter/dashboard",
    navItems: [
      { to: "/recruiter/dashboard", label: "Dashboard" },
      { to: "/recruiter/pipeline", label: "Pipeline" },
      { to: "/recruiter/jobs", label: "Jobs" },
    ],
  },
  interviewer: {
    label: "Interviewer",
    tagline: "Prepare structured feedback",
    description:
      "See assigned interviews, review candidate context, and submit feedback on time.",
    homePath: "/interviewer",
    navItems: [
      { to: "/interviewer", label: "Home" },
      { to: "/interviewer/pipeline", label: "Pipeline" },
      { to: "/interviewer/schedule", label: "Schedule" },
    ],
  },
};

export function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" && PLATFORM_ROLES.includes(value as PlatformRole)
  );
}

/**
 * Map any role string (canonical backend role or frontend platform role) to
 * a platform role.
 * - CANDIDATE / RECRUITER / INTERVIEWER (any casing) pass through
 * - ADMIN is treated as recruiter (closest product surface)
 * - anything else returns null
 */
export function normalizeRole(role: string | undefined): PlatformRole | null {
  if (typeof role !== "string") {
    return null;
  }

  const lower = role.toLowerCase();

  if (isPlatformRole(lower)) {
    return lower;
  }

  if (lower === "admin") {
    return "recruiter";
  }

  return null;
}

/**
 * Resolve the effective platform role for a signed-in user.
 *
 * The backend issues canonical roles, so normalizeRole covers real sessions.
 * The intendedRole fallback remains only for the TEMPORARY frontend-only
 * demo session; remove it together with the mock session.
 */
export function resolveRole(
  backendRole: string | undefined,
  intendedRole: PlatformRole | null,
): PlatformRole {
  return normalizeRole(backendRole) ?? intendedRole ?? "candidate";
}

export function getRoleHomePath(role: string | undefined): string {
  const normalized = normalizeRole(role);
  return normalized ? roleConfig[normalized].homePath : "/";
}

export function getRoleNavItems(role: PlatformRole): RoleNavItem[] {
  return roleConfig[role].navItems;
}

export function getRoleLabel(role: PlatformRole): string {
  return roleConfig[role].label;
}

// ---------------------------------------------------------------------------
// Intended-role persistence: the role a visitor picks before signing up or
// signing in. Survives the auth flow (including a future OAuth round-trip).
// ---------------------------------------------------------------------------

const INTENDED_ROLE_STORAGE_KEY = "hireflow.intendedRole";

export function readStoredIntendedRole(): PlatformRole | null {
  try {
    const stored = window.localStorage.getItem(INTENDED_ROLE_STORAGE_KEY);
    return isPlatformRole(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeIntendedRole(role: PlatformRole | null): void {
  try {
    if (role) {
      window.localStorage.setItem(INTENDED_ROLE_STORAGE_KEY, role);
    } else {
      window.localStorage.removeItem(INTENDED_ROLE_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (private mode, etc.) — role context is best-effort.
  }
}
