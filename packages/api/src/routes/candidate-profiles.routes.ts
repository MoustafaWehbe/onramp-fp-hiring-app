import { Router } from "express";

import { validate }
  from "../middleware/validate";

import {
  candidateProfileController,
} from "../controllers/candidate-profiles.controllers";

import {
  createCandidateProfileSchema,
} from "../schemas/candidate-profiles.schemas";

const router = Router();

router.post(
  "/",
  validate(createCandidateProfileSchema),
  candidateProfileController.create,
);
router.get(
  "/",
  candidateProfileController.getAll,
);
router.get(
  "/:id",
  candidateProfileController.getById,
);
export { router as candidateProfileRouter };