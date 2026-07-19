import { Router } from "express";
import { validate } from "../middleware/validate";

import { jobController } from "../controllers/jobs.controllers";
import { createJobSchema } from "../schemas/jobs.schemas";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  validate(createJobSchema),
  jobController.create,
);

export { router as jobRouter };