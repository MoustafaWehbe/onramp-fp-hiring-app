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
  /**
   * True while an account still owes the one-time "hiring or looking for
   * work?" answer. Only accounts created through a provider start this way —
   * OAuth hands us an identity, never a role — so `role` is still holding its
   * CANDIDATE default and must not be trusted until this clears.
   */
  roleSelectionPending?: boolean;
}

export type OAuthProvider = "google" | "github";
