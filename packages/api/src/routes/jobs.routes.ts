import { Router } from "express";
import { validate } from "../middleware/validate";

import { jobController } from "../controllers/jobs.controllers";
import { createJobSchema } from "../schemas/jobs.schemas";

const router = Router();

router.post(
  "/",
  validate(createJobSchema),
  jobController.create,
);

export { router as jobRouter };