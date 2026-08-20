import { Router } from "express";
import { recruiterController } from "../controllers/recruiter.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePro } from "../middleware/requirePro";
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
import { calendarController } from "../controllers/calendar.controller";
import { recruiterReportQuerySchema } from "../schemas/reports.schemas";

const router = Router();
const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];
// Talent pool / CRM is a Pro feature. The candidate detail route is
// deliberately excluded below — it's also how a Free-tier recruiter opens an
// applicant from their (still-available) pipeline, so it can't be gated.
const requireProRecruiter = [...requireRecruiter, requirePro];

// Calendar consent is deliberately separate from sign-in OAuth. The callback
// is protected by its signed, purpose-scoped state cookie; every JSON endpoint
// and the flow start still require an authenticated recruiter.
router.get(
  "/calendar/callback",
  calendarController.callback,
);
router.get(
  "/calendar/connect",
  ...requireRecruiter,
  calendarController.connect,
);
router.get(
  "/calendar/connection",
  ...requireRecruiter,
  calendarController.connection,
);
router.delete(
  "/calendar/connection",
  ...requireRecruiter,
  calendarController.disconnect,
);
router.get("/calendar", ...requireRecruiter, calendarController.list);

router.get(
  "/dashboard",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  recruiterController.dashboard,
);

router.get(
  "/candidates",
  ...requireProRecruiter,
  validate(recruiterCandidateFiltersSchema, "query"),
  talentPoolController.listCandidates,
);
// Not Pro-gated: also reached from a Free-tier recruiter's own pipeline
// (PipelineCard's "view applicant" link). The Pro-only widgets on this page
// (talent pool actions, scorecards) lock at the component level instead.
router.get(
  "/candidates/:candidateId",
  ...requireRecruiter,
  validate(candidateIdParamSchema, "params"),
  talentPoolController.getCandidate,
);
router.post(
  "/candidates/:candidateId/pool",
  ...requireProRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(addCandidateToPoolSchema),
  talentPoolController.addToPool,
);
router.patch(
  "/candidates/:candidateId/pool",
  ...requireProRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(updateCandidatePoolSchema),
  talentPoolController.updatePool,
);
router.delete(
  "/candidates/:candidateId/pool",
  ...requireProRecruiter,
  validate(candidateIdParamSchema, "params"),
  talentPoolController.removeFromPool,
);
router.post(
  "/candidates/:candidateId/invite",
  ...requireProRecruiter,
  validate(candidateIdParamSchema, "params"),
  validate(inviteCandidateSchema),
  talentPoolController.invite,
);

router.get("/tags", ...requireProRecruiter, talentPoolController.listTags);
router.post(
  "/tags",
  ...requireProRecruiter,
  validate(createCandidateTagSchema),
  talentPoolController.createTag,
);
router.delete(
  "/tags/:tagId",
  ...requireProRecruiter,
  validate(tagIdParamSchema, "params"),
  talentPoolController.deleteTag,
);
router.get(
  "/analytics",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  recruiterController.analytics,
);
router.get(
  "/reports",
  ...requireProRecruiter,
  validate(recruiterReportQuerySchema, "query"),
  recruiterController.reports,
);

export { router as recruiterRouter };
