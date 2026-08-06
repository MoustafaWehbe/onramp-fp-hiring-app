import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { JwtPayload, TokenPair } from "./types";

function getSecret(envKey: string, fallback: string): string {
  const value = process.env[envKey];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env var: ${envKey}`);
  }
  return value ?? fallback;
}

export function signAccessToken(payload: JwtPayload): string {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "15m";
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * The `jti` is what makes each refresh token a distinct string.
 *
 * Without it the payload is just {userId, iat, exp}, so two tokens minted for
 * the same user inside the same second are byte-identical — and since
 * refresh_tokens.token_hash is UNIQUE, storing the second one fails outright.
 * Opening two sessions in quick succession (or signing in again right after
 * an OAuth callback) is enough to hit it. A random id per token removes the
 * collision at the source; nothing reads the claim, so verification is
 * unchanged and tokens issued before this still verify.
 */
export function signRefreshToken(payload: Pick<JwtPayload, "userId">): string {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, secret, {
    expiresIn,
    jwtid: randomUUID(),
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = getSecret("JWT_SECRET", "dev-access-secret");
  return jwt.verify(token, secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, "userId"> {
  const secret = getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret");
  return jwt.verify(token, secret) as Pick<JwtPayload, "userId">;
}

export function generateTokenPair(payload: JwtPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ userId: payload.userId }),
  };
}
