import type { OAuthProvider } from "@starter-kit/shared/db";

/**
 * Per-provider OAuth 2.0 endpoints and the normalisation of each provider's
 * user payload into one shape.
 *
 * Deliberately no Passport: passport-google-oauth20 and friends keep the
 * `state` nonce in an express-session, and this app has no server-side
 * session store — auth is JWT cookies end to end. Wiring express-session in
 * for the ten minutes a redirect is in flight would mean running a second
 * session system next to the real one, which is exactly what we were asked
 * not to do. The authorization-code exchange itself is two HTTP calls, so it
 * lives here in the same service/controller shape as the rest of the API.
 */

/** A provider's user, reduced to what account creation actually needs. */
export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  /** Whether the provider asserts the user owns this address. */
  emailVerified: boolean;
  name: string | null;
}

export interface OAuthProviderConfig {
  id: OAuthProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra params some providers want on the authorize URL. */
  authorizeParams?: Record<string, string>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
}

/** Providers are slow far more often than they are broken; cap the wait. */
const PROVIDER_TIMEOUT_MS = 10_000;

export class OAuthProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthProviderError";
  }
}

async function getJson(url: string, accessToken: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "HireFlow",
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new OAuthProviderError(
      `Provider responded ${response.status} for ${url}`,
    );
  }

  return response.json();
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const google: OAuthProviderConfig = {
  id: "google",
  label: "Google",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope: "openid email profile",
  clientIdEnv: "GOOGLE_CLIENT_ID",
  clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  authorizeParams: {
    // Ask for the account chooser every time rather than silently reusing
    // whichever Google account the browser happens to be signed into.
    prompt: "select_account",
  },
  async fetchProfile(accessToken) {
    const raw = (await getJson(
      "https://openidconnect.googleapis.com/v1/userinfo",
      accessToken,
    )) as Record<string, unknown>;

    const providerUserId = asString(raw.sub);
    if (!providerUserId) {
      throw new OAuthProviderError("Google userinfo returned no subject id");
    }

    return {
      providerUserId,
      email: asString(raw.email),
      emailVerified: raw.email_verified === true,
      name: asString(raw.name) ?? asString(raw.given_name),
    };
  },
};

interface GitHubEmail {
  email?: unknown;
  primary?: unknown;
  verified?: unknown;
}

const github: OAuthProviderConfig = {
  id: "github",
  label: "GitHub",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scope: "read:user user:email",
  clientIdEnv: "GITHUB_CLIENT_ID",
  clientSecretEnv: "GITHUB_CLIENT_SECRET",
  async fetchProfile(accessToken) {
    const raw = (await getJson(
      "https://api.github.com/user",
      accessToken,
    )) as Record<string, unknown>;

    const id = raw.id;
    const providerUserId =
      typeof id === "number" ? String(id) : asString(id);
    if (!providerUserId) {
      throw new OAuthProviderError("GitHub /user returned no id");
    }

    const name = asString(raw.name) ?? asString(raw.login);

    // /user only exposes the public profile email, which is usually null and
    // is never marked verified. The primary verified address lives behind
    // /user/emails (the reason for the user:email scope).
    let email = asString(raw.email);
    let emailVerified = false;

    const emails = (await getJson(
      "https://api.github.com/user/emails",
      accessToken,
    )) as GitHubEmail[];

    if (Array.isArray(emails)) {
      const primary =
        emails.find((entry) => entry.primary === true && entry.verified === true) ??
        emails.find((entry) => entry.verified === true);

      if (primary) {
        email = asString(primary.email);
        emailVerified = true;
      }
    }

    return { providerUserId, email, emailVerified, name };
  },
};

const PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  google,
  github,
};

export function getProviderConfig(
  provider: OAuthProvider,
): OAuthProviderConfig {
  return PROVIDERS[provider];
}

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Credentials for a provider, or null when the deployment has not configured
 * it. Read per call rather than cached at import time so tests and local
 * `.env` reloads see current values.
 */
export function getProviderCredentials(
  provider: OAuthProvider,
): ProviderCredentials | null {
  const config = PROVIDERS[provider];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

/** Providers with credentials present — drives which buttons the UI shows. */
export function listEnabledProviders(): OAuthProvider[] {
  return (Object.keys(PROVIDERS) as OAuthProvider[]).filter(
    (provider) => getProviderCredentials(provider) !== null,
  );
}

/**
 * Trade an authorization code for an access token. Both providers implement
 * the same RFC 6749 form post; GitHub only differs in needing an explicit
 * Accept header to answer with JSON instead of a urlencoded body.
 */
export async function exchangeCodeForAccessToken(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  credentials: ProviderCredentials,
): Promise<string> {
  const config = PROVIDERS[provider];

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "HireFlow",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }).toString(),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  const body = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    error?: unknown;
    error_description?: unknown;
  } | null;

  if (!response.ok || !body) {
    throw new OAuthProviderError(
      `${config.label} token exchange failed with status ${response.status}`,
    );
  }

  // A 200 carrying an `error` key is GitHub's way of reporting bad client
  // credentials, so status alone is not enough to call this a success.
  if (body.error) {
    throw new OAuthProviderError(
      `${config.label} token exchange rejected: ${String(
        body.error_description ?? body.error,
      )}`,
    );
  }

  const accessToken = asString(body.access_token);
  if (!accessToken) {
    throw new OAuthProviderError(
      `${config.label} token exchange returned no access token`,
    );
  }

  return accessToken;
}
