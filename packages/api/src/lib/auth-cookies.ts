import type { Response } from "express";

/**
 * The session cookies, in one place.
 *
 * Password login and OAuth callbacks both end here, so a session issued by
 * either route is byte-for-byte the same thing to every downstream reader —
 * that is the whole point of routing both through these helpers rather than
 * letting the OAuth controller hand-roll its own `res.cookie` calls.
 */

const isProduction = (): boolean => process.env.NODE_ENV === "production";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";
export const OAUTH_STATE_COOKIE = "oauthState";
export const CALENDAR_OAUTH_STATE_COOKIE = "calendarOAuthState";

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000; // 10 minutes

const REFRESH_COOKIE_PATH = "/api/auth/refresh";
const OAUTH_STATE_COOKIE_PATH = "/api/auth";
const CALENDAR_OAUTH_STATE_COOKIE_PATH = "/api/recruiter/calendar";

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/api",
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/api" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

/**
 * Holds the signed OAuth state while the user is away at the provider.
 *
 * SameSite=Lax is load-bearing rather than incidental: the provider returns
 * the user by top-level GET navigation, which Lax allows and Strict would
 * not — a Strict cookie would be withheld on exactly the request that needs
 * it, and every callback would look like a forgery.
 */
export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: OAUTH_STATE_COOKIE_PATH });
}

/** Separate state cookie so calendar consent can never satisfy sign-in OAuth. */
export function setCalendarOAuthStateCookie(
  res: Response,
  state: string,
): void {
  res.cookie(CALENDAR_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: CALENDAR_OAUTH_STATE_COOKIE_PATH,
    maxAge: OAUTH_STATE_MAX_AGE,
  });
}

export function clearCalendarOAuthStateCookie(res: Response): void {
  res.clearCookie(CALENDAR_OAUTH_STATE_COOKIE, {
    path: CALENDAR_OAUTH_STATE_COOKIE_PATH,
  });
}
