import { Router } from "express";
import { Job } from "@starter-kit/shared/db";

import { validate } from "../middleware/validate";
import { jobController } from "../controllers/jobs.controllers";
import {
  createJobSchema,
  jobIdParamSchema,
  updateJobSchema,
} from "../schemas/jobs.schemas";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

const ownJobGuard = ownershipGuard<Job>(
  (req) => Job.findByPk(req.params.id as string),
  {
    getOwnerId: (job) => job.companyId,
    getCallerId: getCallerCompanyId,
    resultKey: "job",
    notFoundMessage: "Job not found",
  },
);

// These must remain above /:id so Express does not interpret "public" as a
// recruiter job id.
router.get("/public", jobController.listPublic);
router.get(
  "/public/:id",
  validate(jobIdParamSchema, "params"),
  jobController.getPublicById,
);

router.post(
  "/",
  ...requireRecruiter,
  validate(createJobSchema),
  jobController.create,
);
router.get(
  "/",
  ...requireRecruiter,
  jobController.list,
);
router.get(
  "/:id",
  ...requireRecruiter,
  validate(jobIdParamSchema, "params"),
  ownJobGuard,
  jobController.getById,
);
router.put(
  "/:id",
  ...requireRecruiter,
  validate(jobIdParamSchema, "params"),
  validate(updateJobSchema),
  ownJobGuard,
  jobController.update,
);
router.delete(
  "/:id",
  ...requireRecruiter,
  validate(jobIdParamSchema, "params"),
  ownJobGuard,
  jobController.delete,
);

export { router as jobRouter };
