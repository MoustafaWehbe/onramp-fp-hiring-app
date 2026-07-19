import { Router } from "express";

import { validate }
  from "../middleware/validate";
import {
  updateApplicationStageSchema,
} from "../schemas/applications.schemas";

import {
  applicationController,
} from "../controllers/applications.controllers";

import {
  createApplicationSchema,
} from "../schemas/applications.schemas";
import {
  assignInterviewerSchema,
} from "../schemas/applications.schemas";

import { Application, CandidateProfile, Job } from "@starter-kit/shared/db";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";

const router = Router();

const requireCandidate = [authenticate, authorize("CANDIDATE")];
const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

// Applying is self-scoped to the caller's own candidate profile, the same
// "own profile" pattern candidate.routes.ts uses — never a client-supplied
// candidateProfileId.
const ownCandidateProfileGuard = ownershipGuard<CandidateProfile>(
  (req) => CandidateProfile.findOne({ where: { userId: req.user!.userId } }),
  { resultKey: "candidateProfile", notFoundMessage: "Candidate profile not found" },
);

// Viewing a job's applicant list is scoped to the job belonging to the
// caller's company.
const ownJobForApplicationsGuard = ownershipGuard<Job>(
  (req) => Job.findByPk(req.params.jobId as string),
  {
    getOwnerId: (job) => job.companyId,
    getCallerId: getCallerCompanyId,
    resultKey: "job",
    notFoundMessage: "Job not found",
  },
);

type ApplicationWithJob = Application & { job?: Job };

// Stage changes and interviewer assignment are scoped through the
// application's job to the caller's company — Application has no companyId
// of its own, so ownership runs through its parent job, mirroring how
// WorkExperience ownership runs through its parent CandidateProfile.
const ownApplicationGuard = ownershipGuard<ApplicationWithJob>(
  (req) =>
    Application.findByPk(req.params.id as string, {
      include: [{ model: Job, as: "job" }],
    }) as Promise<ApplicationWithJob | null>,
  {
    getOwnerId: (application) => application.job?.companyId,
    getCallerId: getCallerCompanyId,
    resultKey: "application",
    notFoundMessage: "Application not found",
  },
);

router.post(
  "/",
  ...requireCandidate,
  validate(createApplicationSchema),
  ownCandidateProfileGuard,
  applicationController.create,
);
router.get(
  "/job/:jobId",
  ...requireRecruiter,
  ownJobForApplicationsGuard,
  applicationController.getByJob,
);
router.patch(
  "/:id/stage",
  ...requireRecruiter,
  validate(updateApplicationStageSchema),
  ownApplicationGuard,
  applicationController.updateStage,
);
router.post(
  "/:id/assign-interviewer",
  ...requireRecruiter,
  validate(assignInterviewerSchema),
  ownApplicationGuard,
  applicationController.assignInterviewer,
);
export { router as applicationRouter };