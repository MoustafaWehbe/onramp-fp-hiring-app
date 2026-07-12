import { USER_ROLES, type UserRole } from "./types";

/** Roles that operate the hiring side of the platform (everyone but candidates). */
export type InternalRole = Exclude<UserRole, "CANDIDATE">;

export const INTERNAL_ROLES: readonly InternalRole[] = [
  "ADMIN",
  "RECRUITER",
  "INTERVIEWER",
];

/**
 * Roles a visitor may pick for themselves at registration. ADMIN is excluded:
 * it is granted only by the seeder or by another admin.
 */
export type SelfAssignableRole = Exclude<UserRole, "ADMIN">;

export const SELF_ASSIGNABLE_ROLES: readonly SelfAssignableRole[] = [
  "CANDIDATE",
  "RECRUITER",
  "INTERVIEWER",
];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function isInternalRole(role: UserRole): role is InternalRole {
  return role !== "CANDIDATE";
}
