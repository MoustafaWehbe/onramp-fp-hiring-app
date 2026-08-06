import { Router } from "express";
import { ScorecardTemplate } from "@starter-kit/shared/db";
import { scorecardTemplateController } from "../controllers/scorecard-templates.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";
import {
  createScorecardTemplateSchema,
  scorecardTemplateIdParamSchema,
  updateScorecardTemplateSchema,
} from "../schemas/scorecards.schemas";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

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

router.get("/", ...requireRecruiter, scorecardTemplateController.list);

router.post(
  "/",
  ...requireRecruiter,
  validate(createScorecardTemplateSchema),
  scorecardTemplateController.create,
);

router.put(
  "/:id",
  ...requireRecruiter,
  validate(scorecardTemplateIdParamSchema, "params"),
  validate(updateScorecardTemplateSchema),
  ownTemplateGuard,
  scorecardTemplateController.update,
);

router.delete(
  "/:id",
  ...requireRecruiter,
  validate(scorecardTemplateIdParamSchema, "params"),
  ownTemplateGuard,
  scorecardTemplateController.remove,
);

export { router as scorecardTemplateRouter };
