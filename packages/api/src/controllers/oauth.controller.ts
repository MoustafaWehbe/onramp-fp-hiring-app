import type { Request, Response } from "express";
import type { OAuthProvider } from "@starter-kit/shared/db";
import {
  clearOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
  OAUTH_STATE_COOKIE,
} from "../lib/auth-cookies";
import { listEnabledProviders } from "../lib/oauth/providers";
import {
  appBaseUrl,
  oauthService,
  OAuthFlowError,
  type OAuthErrorCode,
} from "../services/oauth.service";

/**
 * OAuth lives in a browser redirect, so it cannot use the API's JSON error
 * envelope — there is no client-side code listening, only a navigating tab.
 * Every exit from these handlers is therefore a 302 to a frontend URL, and
 * the failure modes travel as `oauth_error` codes the login page renders as
 * sentences. Nothing here may throw into the error handler: an unhandled
 * error in a callback is the blank screen we are explicitly avoiding.
 */

function frontendUrl(path: string, params: Record<string, string>): string {
  const url = new URL(path, appBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function redirectWithError(
  res: Response,
  provider: OAuthProvider,
  code: OAuthErrorCode,
): void {
  res.redirect(frontendUrl("/login", { oauth_error: code, provider }));
}

/**
 * Log the provider-side detail server-side only. It can name a
 * misconfiguration or quote a provider's response, neither of which belongs
 * in a URL the user can read or a referrer header we do not control.
 */
function logFailure(provider: OAuthProvider, err: unknown): OAuthErrorCode {
  if (err instanceof OAuthFlowError) {
    if (process.env.NODE_ENV !== "test") {
      console.error(`[oauth:${provider}] ${err.code}`, err.detail ?? "");
    }
    return err.code;
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(`[oauth:${provider}] unexpected failure`, err);
  }
  return "provider_error";
}

export function makeOAuthController(provider: OAuthProvider) {
  return {
    /** GET /api/auth/:provider — send the user to the consent screen. */
    start(req: Request, res: Response): void {
      try {
        const role =
          typeof req.query.role === "string" ? req.query.role : undefined;
        const returnTo =
          typeof req.query.returnTo === "string" &&
          req.query.returnTo.startsWith("/")
            ? req.query.returnTo
            : undefined;

        const { url, stateToken } = oauthService.buildAuthorizationRequest({
          provider,
          role,
          returnTo,
        });

        setOAuthStateCookie(res, stateToken);
        res.redirect(url);
      } catch (err) {
        redirectWithError(res, provider, logFailure(provider, err));
      }
    },

    /** GET /api/auth/:provider/callback — the provider brings them back. */
    async callback(req: Request, res: Response): Promise<void> {
      // The state is single-use whatever happens next, including on the paths
      // that fail: leaving it live would let a stale nonce be replayed.
      const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE] as
        | string
        | undefined;
      clearOAuthStateCookie(res);

      try {
        const result = await oauthService.completeCallback({
          provider,
          code: typeof req.query.code === "string" ? req.query.code : undefined,
          stateParam:
            typeof req.query.state === "string" ? req.query.state : undefined,
          stateCookie,
          error:
            typeof req.query.error === "string" ? req.query.error : undefined,
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        });

        setAuthCookies(
          res,
          result.session.accessToken,
          result.session.refreshToken,
        );

        // The frontend finishes the trip: it re-reads /auth/me behind this
        // page and decides between the role prompt and the workspace, so the
        // decision lives with the code that owns the routing table.
        const params: Record<string, string> = { provider };
        if (result.isNewUser) {
          params.status = "new";
        }
        if (result.intendedRole) {
          params.role = result.intendedRole;
        }
        if (result.returnTo) {
          params.returnTo = result.returnTo;
        }

        res.redirect(frontendUrl("/auth/callback", params));
      } catch (err) {
        redirectWithError(res, provider, logFailure(provider, err));
      }
    },
  };
}

/**
 * GET /api/auth/providers — which buttons the sign-in forms should render.
 * A provider without credentials would otherwise show a button that can only
 * bounce the user back to an error.
 */
export function listProviders(_req: Request, res: Response): void {
  res.json({ data: { providers: listEnabledProviders() } });
}
