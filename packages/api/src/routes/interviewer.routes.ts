import { Router } from "express";
import { interviewerController } from "../controllers/interviewer.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.get(
  "/assignments/me",
  authenticate,
  authorize("INTERVIEWER"),
  interviewerController.getMyAssignments,
);

export { router as interviewerRouter };
