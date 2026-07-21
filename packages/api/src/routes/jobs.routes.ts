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
router.get(
  "/",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  jobController.list,
);
router.get(
  "/:id",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  jobController.getById,
);
router.put(
  "/:id",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  jobController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  jobController.delete,
);
export { router as jobRouter };