import { Router } from "express";
import { authRouter } from "./auth.routes";
import { companyRouter } from "./company.routes";
import { jobRouter } from "./jobs.routes";
const router = Router();
router.use("/companies", companyRouter);
router.use("/auth", authRouter);
router.use("/jobs", jobRouter);
export default router;