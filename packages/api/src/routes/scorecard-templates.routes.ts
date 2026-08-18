import { Router } from "express";
import { ScorecardTemplate } from "@starter-kit/shared/db";
import { scorecardTemplateController } from "../controllers/scorecard-templates.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePro } from "../middleware/requirePro";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";
import {
  createScorecardTemplateSchema,
  scorecardTemplateIdParamSchema,
  updateScorecardTemplateSchema,
} from "../schemas/scorecards.schemas";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];
// Scorecard templates are a Pro feature end to end (read and write). Note:
// requirePro resolves "no company" as 403 before this route's own
// ownership/"complete your profile" checks ever run, so a companyless
// recruiter now gets 403 here instead of the controller's previous 409 —
// a deliberate, documented trade-off for having one reusable gate.
const requireProRecruiter = [...requireRecruiter, requirePro];

// Templates are company property, so ownership is "this template's companyId
// matches the caller's" — the same shape company.routes uses, and the reason
// a template from another company reads as 404 rather than 403.
const ownTemplateGuard = ownershipGuard<ScorecardTemplate>(
  (req) => ScorecardTemplate.findByPk(req.params.id as string),
  {
    getOwnerId: (template) => template.companyId,
    getCallerId: getCallerCompanyId,
    resultKey: "scorecardTemplate",
    notFoundMessage: "Scorecard template not found",
  },
);

router.get("/", ...requireProRecruiter, scorecardTemplateController.list);

router.post(
  "/",
  ...requireProRecruiter,
  validate(createScorecardTemplateSchema),
  scorecardTemplateController.create,
);

router.put(
  "/:id",
  ...requireProRecruiter,
  validate(scorecardTemplateIdParamSchema, "params"),
  validate(updateScorecardTemplateSchema),
  ownTemplateGuard,
  scorecardTemplateController.update,
);

router.delete(
  "/:id",
  ...requireProRecruiter,
  validate(scorecardTemplateIdParamSchema, "params"),
  ownTemplateGuard,
  scorecardTemplateController.remove,
);

export { router as scorecardTemplateRouter };
