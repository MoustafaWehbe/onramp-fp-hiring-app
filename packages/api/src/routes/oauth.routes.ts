import { Router } from "express";
import { OAUTH_PROVIDERS } from "@starter-kit/shared/db";
import {
  listProviders,
  makeOAuthController,
} from "../controllers/oauth.controller";
import { authRateLimiter } from "../middleware/rate-limiter";

const router = Router();

router.get("/providers", listProviders);

/**
 * One explicit pair of routes per provider rather than a `/:provider` param:
 * this router shares the /api/auth mount with the password routes, and a
 * wildcard segment there would happily swallow a GET to any future auth path
 * that has not been declared yet.
 *
 * Only the start route is rate limited. The callback is not initiated by the
 * user — throttling it would strand people mid-redirect, and it is already
 * gated by a signed, single-use state that has to have been issued by the
 * start route in the first place.
 */
for (const provider of OAUTH_PROVIDERS) {
  const controller = makeOAuthController(provider);

  router.get(`/${provider}`, authRateLimiter, controller.start);
  router.get(`/${provider}/callback`, controller.callback);
}

export { router as oauthRouter };
