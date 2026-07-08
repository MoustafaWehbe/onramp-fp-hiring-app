import type { PlatformRole } from "../types/users";

/**
 * Google OAuth — frontend preparation only.
 *
 * The backend endpoint (/api/auth/google) does not exist yet. The UI shows a
 * "Continue with Google" button in a clearly disabled, coming-soon state until
 * VITE_ENABLE_GOOGLE_OAUTH is flipped to "true" after backend setup.
 *
 * No client secrets belong in this package — the browser only ever needs the
 * redirect URL. GOOGLE_CLIENT_SECRET stays on the server.
 */

export function isGoogleOAuthEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_GOOGLE_OAUTH === "true";
}

/**
 * URL the browser should visit to start the Google OAuth flow.
 * The intended role rides along so the backend can bounce the user back to
 * the right workspace after the OAuth round-trip.
 */
export function getGoogleOAuthUrl(intendedRole?: PlatformRole | null): string {
  const base = "/api/auth/google";
  return intendedRole
    ? `${base}?role=${encodeURIComponent(intendedRole)}`
    : base;
}
