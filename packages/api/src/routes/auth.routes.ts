import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rate-limiter";
import {
  registerSchema,
  loginSchema,
  roleSelectionSchema,
} from "../schemas/auth.schemas";
import { oauthRouter } from "./oauth.routes";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  authController.login
);
// /refresh must NOT require a live access token (refreshing an expired one is
// its purpose); it validates its own refresh cookie and 401s on its own.
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

// One-time role prompt for accounts created through a provider, which arrive
// with an identity but no answer to "hiring or looking for work?".
router.post(
  "/role",
  authenticate,
  validate(roleSelectionSchema),
  authController.selectRole,
);

// Provider sign-in shares this mount so the routes read /api/auth/google,
// /api/auth/github, and so on.
router.use("/", oauthRouter);

export { router as authRouter };