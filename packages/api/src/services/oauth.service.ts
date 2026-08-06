import { randomBytes, randomUUID } from "crypto";
import {
  hashPassword,
  signOAuthState,
  verifyOAuthState,
} from "@starter-kit/shared/auth";
import {
  getSequelize,
  OAuthIdentity,
  User,
  type OAuthProvider,
} from "@starter-kit/shared/db";
import {
  exchangeCodeForAccessToken,
  getProviderConfig,
  getProviderCredentials,
  OAuthProviderError,
  type OAuthProfile,
} from "../lib/oauth/providers";
import { authService, type IssuedSession } from "./auth.service";

/**
 * Every way this flow can end badly, as a code the login page can turn into a
 * sentence. The callback runs in a browser redirect, so there is nobody to
 * read a JSON error body — the only channel back to the user is the query
 * string we redirect to, and it must never be a stack trace or a blank page.
 */
export type OAuthErrorCode =
  | "provider_not_configured"
  | "access_denied"
  | "invalid_state"
  | "missing_code"
  | "email_exists"
  | "email_missing"
  | "email_unverified"
  | "provider_error";

export class OAuthFlowError extends Error {
  readonly code: OAuthErrorCode;
  /** Provider-reported detail, for logs only — never shown to the user. */
  readonly detail?: string;

  constructor(code: OAuthErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "OAuthFlowError";
    this.code = code;
    this.detail = detail;
  }
}

export interface AuthorizationRequest {
  /** Where to send the browser. */
  url: string;
  /** Signed state to store in a cookie and match on the way back. */
  stateToken: string;
  /** Value echoed by the provider in the `state` query param. */
  nonce: string;
}

export interface CallbackResult {
  session: IssuedSession;
  /** True when this callback created the account (drives role selection). */
  isNewUser: boolean;
  /** Role the visitor had picked before leaving, if any. */
  intendedRole?: string;
  returnTo?: string;
}

/**
 * Base URL the provider redirects back to. Points at the frontend origin in
 * development because Vite proxies /api to the API — keeping the whole
 * round-trip on one origin, so the session cookies the callback sets are the
 * same ones the app sends afterwards.
 */
function callbackBaseUrl(): string {
  return (
    process.env.OAUTH_CALLBACK_BASE_URL ??
    process.env.CORS_ORIGIN ??
    "http://localhost:5173"
  );
}

export function redirectUriFor(provider: OAuthProvider): string {
  return `${callbackBaseUrl().replace(/\/$/, "")}/api/auth/${provider}/callback`;
}

/** Frontend origin the callback finally lands the browser on. */
export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.CORS_ORIGIN ??
    "http://localhost:5173"
  );
}

/**
 * OAuth accounts have no password, but users.password_hash is NOT NULL and
 * every other code path may assume a real bcrypt hash is there. Storing the
 * hash of a random 32-byte secret that is discarded on the next line keeps
 * the column honest: the value is a valid hash of a password that has never
 * existed, so password login for this account simply never matches. That is
 * strictly safer than a sentinel string, which some future comparison could
 * be tricked into treating as a password.
 */
async function unusablePasswordHash(): Promise<string> {
  return hashPassword(randomBytes(32).toString("hex"));
}

export class OAuthService {
  /**
   * Build the provider's consent URL. The state is signed rather than stored:
   * see signOAuthState for why this app has nowhere server-side to put it.
   */
  buildAuthorizationRequest(input: {
    provider: OAuthProvider;
    role?: string;
    returnTo?: string;
  }): AuthorizationRequest {
    const credentials = getProviderCredentials(input.provider);

    if (!credentials) {
      throw new OAuthFlowError(
        "provider_not_configured",
        `${input.provider} client id/secret are not set`,
      );
    }

    const config = getProviderConfig(input.provider);
    const nonce = randomUUID();
    const stateToken = signOAuthState({
      nonce,
      provider: input.provider,
      role: input.role,
      returnTo: input.returnTo,
    });

    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", credentials.clientId);
    url.searchParams.set("redirect_uri", redirectUriFor(input.provider));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", nonce);

    for (const [key, value] of Object.entries(config.authorizeParams ?? {})) {
      url.searchParams.set(key, value);
    }

    return { url: url.toString(), stateToken, nonce };
  }

  /**
   * Validate the state round-trip and return the intent stashed in it.
   *
   * Both halves have to agree: the signed cookie proves we issued this state,
   * and the `state` query param proves the provider is answering *this*
   * browser's attempt. A callback that satisfies only one of them is not a
   * callback for a flow this browser started, and is refused.
   */
  verifyState(input: {
    provider: OAuthProvider;
    stateCookie?: string;
    stateParam?: string;
  }): { role?: string; returnTo?: string } {
    if (!input.stateCookie || !input.stateParam) {
      throw new OAuthFlowError("invalid_state", "missing state cookie or param");
    }

    const payload = verifyOAuthState(input.stateCookie);

    if (!payload) {
      throw new OAuthFlowError("invalid_state", "state cookie failed to verify");
    }

    if (payload.provider !== input.provider) {
      throw new OAuthFlowError("invalid_state", "state is for another provider");
    }

    if (payload.nonce !== input.stateParam) {
      throw new OAuthFlowError("invalid_state", "state nonce mismatch");
    }

    return { role: payload.role, returnTo: payload.returnTo };
  }

  /** Code → access token → normalised profile. */
  async fetchProfile(
    provider: OAuthProvider,
    code: string,
  ): Promise<OAuthProfile> {
    const credentials = getProviderCredentials(provider);

    if (!credentials) {
      throw new OAuthFlowError(
        "provider_not_configured",
        `${provider} client id/secret are not set`,
      );
    }

    try {
      const accessToken = await exchangeCodeForAccessToken(
        provider,
        code,
        redirectUriFor(provider),
        credentials,
      );

      return await getProviderConfig(provider).fetchProfile(accessToken);
    } catch (err) {
      if (err instanceof OAuthProviderError) {
        throw new OAuthFlowError("provider_error", err.message);
      }
      // Network failure, DNS, timeout — the provider is unreachable, which is
      // the user's problem to be told about, not a 500 to be swallowed.
      throw new OAuthFlowError(
        "provider_error",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  /**
   * Turn a verified provider profile into a local user.
   *
   * Three outcomes, in this order:
   *
   * 1. The (provider, provider_user_id) pair is already linked — that is a
   *    returning user, log them straight in.
   * 2. No link, but the email belongs to a password account — refused. We do
   *    NOT link on an email match: the provider is asserting "this person
   *    controls this mailbox", and if that assertion is ever wrong (or the
   *    address was never verified) an attacker gets someone else's account
   *    for free. Linking has to be an explicit, authenticated act.
   * 3. No link and no account — create the user plus the identity row, and
   *    flag it for the role prompt.
   */
  async resolveUser(
    provider: OAuthProvider,
    profile: OAuthProfile,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const identity = await OAuthIdentity.findOne({
      where: { provider, providerUserId: profile.providerUserId },
    });

    if (identity) {
      const user = await User.findByPk(identity.userId);

      if (user) {
        return { user, isNewUser: false };
      }

      // The identity outlived its user, which the CASCADE should prevent.
      // Treat it as unlinked rather than trusting a dangling row.
      await identity.destroy();
    }

    if (!profile.email) {
      throw new OAuthFlowError(
        "email_missing",
        `${provider} returned no email address`,
      );
    }

    // Creating an account on an address the provider will not vouch for would
    // let someone claim a mailbox they do not own, and hand them the account
    // that address later signs up with.
    if (!profile.emailVerified) {
      throw new OAuthFlowError(
        "email_unverified",
        `${provider} has not verified ${profile.email}`,
      );
    }

    const email = profile.email.toLowerCase();
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      throw new OAuthFlowError(
        "email_exists",
        `${email} already belongs to a local account`,
      );
    }

    const user = await getSequelize().transaction(async (transaction) => {
      const created = await User.create(
        {
          email,
          name: profile.name ?? email.split("@")[0],
          passwordHash: await unusablePasswordHash(),
          // role keeps its CANDIDATE default only as a placeholder — the
          // pending flag is what the app actually reads until they answer.
          roleSelectionPending: true,
          emailVerified: true,
        },
        { transaction },
      );

      await OAuthIdentity.create(
        {
          userId: created.id,
          provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        },
        { transaction },
      );

      return created;
    });

    return { user, isNewUser: true };
  }

  /** The whole callback: state check, code exchange, user, session. */
  async completeCallback(input: {
    provider: OAuthProvider;
    code?: string;
    stateParam?: string;
    stateCookie?: string;
    error?: string;
    userAgent?: string | string[];
    ipAddress?: string;
  }): Promise<CallbackResult> {
    // Denied consent arrives as a normal redirect carrying ?error, before any
    // code exists. It is a choice, not a failure.
    if (input.error) {
      throw new OAuthFlowError(
        input.error === "access_denied" ? "access_denied" : "provider_error",
        input.error,
      );
    }

    const { role, returnTo } = this.verifyState({
      provider: input.provider,
      stateCookie: input.stateCookie,
      stateParam: input.stateParam,
    });

    if (!input.code) {
      throw new OAuthFlowError("missing_code", "callback carried no code");
    }

    const profile = await this.fetchProfile(input.provider, input.code);
    const { user, isNewUser } = await this.resolveUser(input.provider, profile);

    const session = await authService.issueSession(user, {
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return { session, isNewUser, intendedRole: role, returnTo };
  }
}

export const oauthService = new OAuthService();
