import { Router } from "express";
import { CandidateProfile, WorkExperience } from "@starter-kit/shared/db";
import { candidateController } from "../controllers/candidate.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { handleUploadError } from "../middleware/upload-error";
import { ownershipGuard } from "../lib/ownership";
import { resumeUpload } from "../lib/resume-upload";
import {
  createProfileSchema,
  updateProfileSchema,
  createExperienceSchema,
  updateExperienceSchema,
  idParamSchema,
  setSkillsSchema,
} from "../schemas/candidate.schemas";

const router = Router();

// Every route here is a candidate acting on their own data.
const requireCandidate = [authenticate, authorize("CANDIDATE")];

type ExperienceWithProfile = WorkExperience & {
  candidateProfile?: CandidateProfile;
};

// GET/PATCH /profile take no :id — "own profile" is looked up by req.user.userId,
// so a missing profile 404s here rather than the handler having to check for it.
const ownProfileGuard = ownershipGuard<CandidateProfile>(
  (req) => CandidateProfile.findOne({ where: { userId: req.user!.userId } }),
  { resultKey: "profile", notFoundMessage: "Candidate profile not found" },
);

// WorkExperience doesn't carry userId directly — ownership runs through its
// parent profile, so the loader includes it and getOwnerId reaches through.
const ownExperienceGuard = ownershipGuard<ExperienceWithProfile>(
  (req) =>
    WorkExperience.findByPk(req.params.id as string, {
      include: [{ model: CandidateProfile, as: "candidateProfile" }],
    }) as Promise<ExperienceWithProfile | null>,
  {
    getOwnerId: (experience) => experience.candidateProfile?.userId,
    resultKey: "experience",
    notFoundMessage: "Work experience not found",
  },
);

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get(
  "/profile",
  ...requireCandidate,
  ownProfileGuard,
  candidateController.getProfile,
);
router.post(
  "/profile",
  ...requireCandidate,
  validate(createProfileSchema),
  candidateController.createProfile,
);
router.patch(
  "/profile",
  ...requireCandidate,
  validate(updateProfileSchema),
  ownProfileGuard,
  candidateController.updateProfile,
);

// ─── Work experience ────────────────────────────────────────────────────────

router.get(
  "/experience",
  ...requireCandidate,
  candidateController.listExperience,
);
router.post(
  "/experience",
  ...requireCandidate,
  validate(createExperienceSchema),
  candidateController.createExperience,
);
router.patch(
  "/experience/:id",
  ...requireCandidate,
  validate(idParamSchema, "params"),
  validate(updateExperienceSchema),
  ownExperienceGuard,
  candidateController.updateExperience,
);
router.delete(
  "/experience/:id",
  ...requireCandidate,
  validate(idParamSchema, "params"),
  ownExperienceGuard,
  candidateController.deleteExperience,
);

// ─── Skills ───────────────────────────────────────────────────────────────────

router.get("/skills", ...requireCandidate, candidateController.getSkills);
router.put(
  "/skills",
  ...requireCandidate,
  validate(setSkillsSchema),
  candidateController.setSkills,
);

// ─── Resume ───────────────────────────────────────────────────────────────────

router.post(
  "/resume",
  ...requireCandidate,
  resumeUpload.single("resume"),
  handleUploadError,
  candidateController.uploadResume,
);

export { router as candidateRouter };
