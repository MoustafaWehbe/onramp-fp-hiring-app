import { Router } from "express";
import { recruiterController } from "../controllers/recruiter.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  recruiterController.dashboard,
);

export { router as recruiterRouter };
