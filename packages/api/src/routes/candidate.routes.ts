import { Router } from "express";
import {
  CandidateEducation,
  CandidateProfile,
  WorkExperience,
} from "@starter-kit/shared/db";
import { candidateController } from "../controllers/candidate.controller";
import { candidateProfileController } from "../controllers/candidate-profile.controller";
import {
  createEducationSchema,
  easyApplySchema,
  recommendationsQuerySchema,
  updateEducationSchema,
  updateProfileExtrasSchema,
} from "../schemas/candidate-profile.schemas";
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
  jobIdParamSchema,
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

type EducationWithProfile = CandidateEducation & {
  candidateProfile?: CandidateProfile;
};

// Same shape as ownExperienceGuard: education has no userId of its own, so
// ownership reaches through its parent profile.
const ownEducationGuard = ownershipGuard<EducationWithProfile>(
  (req) =>
    CandidateEducation.findByPk(req.params.id as string, {
      include: [{ model: CandidateProfile, as: "candidateProfile" }],
    }) as Promise<EducationWithProfile | null>,
  {
    getOwnerId: (education) => education.candidateProfile?.userId,
    resultKey: "education",
    notFoundMessage: "Education entry not found",
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

router.patch(
  "/profile/extras",
  ...requireCandidate,
  validate(updateProfileExtrasSchema),
  ownProfileGuard,
  candidateProfileController.updateExtras,
);
router.post(
  "/profile/seed-from-resume",
  ...requireCandidate,
  ownProfileGuard,
  candidateProfileController.seedFromResume,
);

// ─── Education ───────────────────────────────────────────────────────────────

router.get(
  "/education",
  ...requireCandidate,
  candidateProfileController.listEducation,
);
router.post(
  "/education",
  ...requireCandidate,
  validate(createEducationSchema),
  candidateProfileController.createEducation,
);
router.patch(
  "/education/:id",
  ...requireCandidate,
  validate(idParamSchema, "params"),
  validate(updateEducationSchema),
  ownEducationGuard,
  candidateProfileController.updateEducation,
);
router.delete(
  "/education/:id",
  ...requireCandidate,
  validate(idParamSchema, "params"),
  ownEducationGuard,
  candidateProfileController.deleteEducation,
);

// ─── Easy Apply ──────────────────────────────────────────────────────────────

router.get(
  "/easy-apply/readiness",
  ...requireCandidate,
  candidateProfileController.easyApplyReadiness,
);
router.post(
  "/easy-apply",
  ...requireCandidate,
  validate(easyApplySchema),
  candidateProfileController.easyApply,
);

// ─── Recommendations ─────────────────────────────────────────────────────────

router.get(
  "/recommendations",
  ...requireCandidate,
  validate(recommendationsQuerySchema, "query"),
  candidateProfileController.recommendations,
);

// ─── Skills ───────────────────────────────────────────────────────────────────

// Static "catalog" segment — no conflict with the exact-match "/skills" above,
// and there's no "/skills/:id" route for it to collide with.
router.get(
  "/skills/catalog",
  ...requireCandidate,
  candidateController.listSkillCatalog,
);
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

// ─── AI resume review ───────────────────────────────────────────────────────

// The uploaded file (if any) is only ever read into memory to extract text
// for this one request — resumeUpload buffers to memory and nothing here
// ever hands it to a storage provider, so nothing is written to disk/S3 and
// nothing is persisted to the database. When no file is attached, the
// service falls back to this job's existing application resume or the
// candidate's standing profile.
router.post(
  "/jobs/:jobId/resume-review",
  ...requireCandidate,
  resumeUpload.single("resume"),
  handleUploadError,
  validate(jobIdParamSchema, "params"),
  candidateController.reviewResume,
);

export { router as candidateRouter };
