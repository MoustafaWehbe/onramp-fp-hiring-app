import { Router } from "express";

import { validate } from "../middleware/validate";

import { jobSkillController }
  from "../controllers/job-skills.controllers";

import { attachSkillsSchema }
  from "../schemas/job-skills.schemas";

import { Job } from "@starter-kit/shared/db";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

const ownJobGuard = ownershipGuard<Job>(
  (req) => Job.findByPk(req.params.jobId as string),
  {
    getOwnerId: (job) => job.companyId,
    getCallerId: getCallerCompanyId,
    resultKey: "job",
    notFoundMessage: "Job not found",
  },
);

router.post(
  "/:jobId/skills",
  ...requireRecruiter,
  validate(attachSkillsSchema),
  ownJobGuard,
  jobSkillController.attachSkills,
);

export { router as jobSkillRouter };