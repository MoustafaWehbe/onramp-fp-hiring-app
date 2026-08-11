import jwt from "jsonwebtoken";

/**
 * The OAuth `state` round-trip.
 *
 * State does two jobs. It is the CSRF defence — a callback that arrives
 * without the matching state we issued is not a callback for a flow this
 * browser started — and it is the only place to stash the intent the user
 * expressed before leaving for the provider (which role they were signing up
 * as, where they were headed).
 *
 * We sign it rather than keeping a server-side map because the app has no
 * server-side session store, and adding one just for a 10-minute redirect
 * would mean running a second session system alongside the JWT cookies.
 * The signature is what makes the cookie tamper-evident.
 */

export interface OAuthStatePayload {
  /** Random per-attempt value; must match the `state` query param. */
  nonce: string;
  provider: string;
  /** Role the visitor picked before leaving, if any. */
  role?: string;
  /** Frontend path to land on afterwards. */
  returnTo?: string;
  /** Authenticated account that started a non-sign-in OAuth flow. */
  userId?: string;
  /** Keeps a calendar consent callback distinct from a sign-in callback. */
  purpose?: string;
}

const STATE_TTL_SECONDS = 10 * 60;

function getStateSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("Missing required env var: JWT_SECRET");
  }
  return value ?? "dev-access-secret";
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, getStateSecret(), {
    expiresIn: STATE_TTL_SECONDS,
  });
}

/** Returns null for anything unparseable, tampered with, or expired. */
export function verifyOAuthState(token: string): OAuthStatePayload | null {
  try {
    const decoded = jwt.verify(token, getStateSecret());
    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof (decoded as OAuthStatePayload).nonce !== "string" ||
      typeof (decoded as OAuthStatePayload).provider !== "string"
    ) {
      return null;
    }
    return decoded as OAuthStatePayload;
  } catch {
    return null;
  }
}
