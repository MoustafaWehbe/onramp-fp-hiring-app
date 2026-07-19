import { Router } from "express";

import { validate }
  from "../middleware/validate";

import {
  candidateProfileController,
} from "../controllers/candidate-profiles.controllers";

import {
  createCandidateProfileSchema,
} from "../schemas/candidate-profiles.schemas";

import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];
const requireCandidate = [authenticate, authorize("CANDIDATE")];

// This still duplicates PR #8's POST /api/candidate/profile (candidate
// self-service profile creation) — see the branch audit. Which
// implementation survives is a separate decision; this guard only closes
// the unauthenticated-write hole on the one that exists today.
router.post(
  "/",
  ...requireCandidate,
  validate(createCandidateProfileSchema),
  candidateProfileController.create,
);
router.get(
  "/",
  ...requireRecruiter,
  candidateProfileController.getAll,
);
router.get(
  "/:id",
  ...requireRecruiter,
  candidateProfileController.getById,
);
export { router as candidateProfileRouter };