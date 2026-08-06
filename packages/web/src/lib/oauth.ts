import type { OAuthProvider, PlatformRole } from "../types/users";

/**
 * Provider sign-in, from the browser's side.
 *
 * There is no XHR here on purpose: OAuth is a full-page trip to the
 * provider's consent screen and back, so starting it means navigating, not
 * fetching. The session that comes back is the ordinary HttpOnly cookie pair
 * the password flow issues, which is why nothing downstream of login needs to
 * know how the user got in.
 */

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
  "google",
  "github",
] as const;

export const oauthProviderLabels: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return (
    typeof value === "string" &&
    OAUTH_PROVIDERS.includes(value as OAuthProvider)
  );
}

export interface StartOAuthOptions {
  /** Role the visitor picked before leaving; survives the round-trip. */
  role?: PlatformRole | null;
  /** Path to land on once signed in. */
  returnTo?: string | null;
}

export function buildOAuthStartUrl(
  provider: OAuthProvider,
  { role, returnTo }: StartOAuthOptions = {},
): string {
  const params = new URLSearchParams();
  if (role) {
    params.set("role", role.toUpperCase());
  }
  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return `/api/auth/${provider}${query ? `?${query}` : ""}`;
}

export function startOAuth(
  provider: OAuthProvider,
  options: StartOAuthOptions = {},
): void {
  window.location.assign(buildOAuthStartUrl(provider, options));
}

/**
 * Every way the round-trip can come back unhappy, as a sentence.
 *
 * The backend can only hand us a code in a query string, so the wording lives
 * here. Each one says what happened and what to do next — a dead end with no
 * way forward is the failure mode being avoided, especially for
 * `email_exists`, where the user does have an account and simply needs the
 * password form.
 */
const oauthErrorMessages: Record<string, (provider: string) => string> = {
  access_denied: () =>
    "Sign-in was cancelled, so nothing was shared. You can try again or use your email and password.",
  email_exists: () =>
    "An account with this email already exists — log in with your password below. Once you're in, you can connect your account from your profile.",
  email_missing: (provider) =>
    `${provider} didn't share an email address, so we can't create your account. Sign up with your email instead.`,
  email_unverified: (provider) =>
    `${provider} hasn't verified that email address yet. Verify it with ${provider}, then try again.`,
  invalid_state: () =>
    "That sign-in attempt expired before it came back. Please try again.",
  missing_code: () =>
    "That sign-in attempt came back incomplete. Please try again.",
  provider_not_configured: (provider) =>
    `${provider} sign-in isn't set up on this server yet. Use your email and password for now.`,
  provider_error: (provider) =>
    `We couldn't reach ${provider} just now. Try again in a moment, or sign in with your email and password.`,
};

export function getOAuthErrorMessage(
  code: string | null,
  provider: string | null,
): string | null {
  if (!code) {
    return null;
  }

  const providerLabel = isOAuthProvider(provider)
    ? oauthProviderLabels[provider]
    : "that provider";

  const build = oauthErrorMessages[code];
  return build
    ? build(providerLabel)
    : `Sign-in with ${providerLabel} didn't complete. Try again, or use your email and password.`;
}
