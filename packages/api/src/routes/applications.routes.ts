import { Router } from "express";

import { validate }
  from "../middleware/validate";
import {
  updateApplicationStageSchema,
} from "../schemas/applications.schemas";

import {
  applicationController,
} from "../controllers/applications.controllers";

import {
  createApplicationSchema,
} from "../schemas/applications.schemas";
import {
  assignInterviewerSchema,
} from "../schemas/applications.schemas";
const router = Router();

router.post(
  "/",
  validate(createApplicationSchema),
  applicationController.create,
);
router.get(
  "/job/:jobId",
  applicationController.getByJob,
);
router.patch(
  "/:id/stage",
  validate(updateApplicationStageSchema),
  applicationController.updateStage,
);
router.post(
  "/:id/assign-interviewer",
  validate(assignInterviewerSchema),
  applicationController.assignInterviewer,
);
export { router as applicationRouter };