import { Router } from "express";
import { authController } from "../controllers/auth.controller";
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
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authController.me);

export { router as authRouter };