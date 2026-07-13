import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rate-limiter";
import { registerSchema, loginSchema } from "../schemas/auth.schemas";

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

export { router as authRouter };