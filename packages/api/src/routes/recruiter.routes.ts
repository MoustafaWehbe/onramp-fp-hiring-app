import { Router } from "express";
import { recruiterController } from "../controllers/recruiter.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { talentPoolController } from "../controllers/talent-pool.controller";
import { validate } from "../middleware/validate";
import {
  addCandidateToPoolSchema,
  candidateIdParamSchema,
  createCandidateTagSchema,
  inviteCandidateSchema,
  recruiterCandidateFiltersSchema,
  tagIdParamSchema,
  updateCandidatePoolSchema,
} from "../schemas/talent-pool.schemas";

const router = Router();
const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

router.get(
  "/dashboard",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  recruiterController.dashboard,
);

router.get(
  "/candidates",
  ...requireRecruiter,
  validate(recruiterCandidateFiltersSchema, "query"),
  talentPoolController.listCandidates,
);
router.get(
  "/candidates/:candidateId",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  talentPoolController.getCandidate,
);
router.post(
  "/candidates/:candidateId/pool",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(addCandidateToPoolSchema),
  talentPoolController.addToPool,
);
router.patch(
  "/candidates/:candidateId/pool",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(updateCandidatePoolSchema),
  talentPoolController.updatePool,
);
router.delete(
  "/candidates/:candidateId/pool",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  talentPoolController.removeFromPool,
);
router.post(
  "/candidates/:candidateId/invite",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(inviteCandidateSchema),
  talentPoolController.invite,
);

router.get("/tags", ...requireRecruiter, talentPoolController.listTags);
router.post(
  "/tags",
  ...requireRecruiter,
  validate(createCandidateTagSchema),
  talentPoolController.createTag,
);
router.delete(
  "/tags/:tagId",
  ...requireRecruiter,
  validate(tagIdParamSchema, "params"),
  talentPoolController.deleteTag,
);
router.get(
  "/analytics",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  recruiterController.analytics,
);

export { router as recruiterRouter };
