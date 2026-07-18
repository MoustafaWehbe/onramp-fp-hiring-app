import { Router } from "express";
import { authRouter } from "./auth.routes";
import { candidateRouter } from "./candidate.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/candidate", candidateRouter);

export default router;