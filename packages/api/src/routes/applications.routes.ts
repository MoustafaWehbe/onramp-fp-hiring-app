import { Router } from "express";
import { Op } from "sequelize";

import {
  applicationIdParamSchema,
  assignInterviewerSchema,
  createApplicationSchema,
  updateApplicationInterviewSchema,
  updateApplicationStageSchema,
} from "../schemas/applications.schemas";
import { submitScorecardSchema } from "../schemas/scorecards.schemas";
import { Application, CandidateProfile, Job } from "@starter-kit/shared/db";
import { applicationController } from "../controllers/applications.controllers";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePro } from "../middleware/requirePro";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";
import { resumeUpload } from "../lib/resume-upload";
import { handleUploadError } from "../middleware/upload-error";

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
    Application.findOne({
      where: {
        id: req.params.id as string,
        stage: { [Op.ne]: "DRAFT" },
      },
      include: [
        {
          model: Job,
          as: "job",
          attributes: ["companyId"],
        },
      ],
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
  resumeUpload.single("resume"),
  handleUploadError,
  validate(createApplicationSchema),
  ownCandidateProfileGuard,
  applicationController.create,
);
router.get(
  "/me",
  ...requireCandidate,
  ownCandidateProfileGuard,
  applicationController.getMine,
);
router.get(
  "/job/:jobId",
  ...requireRecruiter,
  ownJobForApplicationsGuard,
  applicationController.getByJob,
);
router.put(
  "/:id/resume",
  ...requireCandidate,
  validate(applicationIdParamSchema, "params"),
  resumeUpload.single("resume"),
  handleUploadError,
  applicationController.replaceResume,
);
router.get(
  "/:id/resume",
  authenticate,
  authorize("CANDIDATE", "RECRUITER", "ADMIN"),
  validate(applicationIdParamSchema, "params"),
  applicationController.downloadResume,
);
// Candidate-scoped: the service checks the application belongs to the caller
// and returns stage history only — never fit score, AI summary, or notes.
router.get(
  "/:id/timeline",
  ...requireCandidate,
  validate(applicationIdParamSchema, "params"),
  applicationController.timeline,
);
router.patch(
  "/:id/stage",
  ...requireRecruiter,
  validate(applicationIdParamSchema, "params"),
  validate(updateApplicationStageSchema),
  ownApplicationGuard,
  applicationController.updateStage,
);
// Separate from /stage so scheduling and note-taking are never coupled to a
// stage change — the same guard scopes both to the job's company.
router.patch(
  "/:id/interview",
  ...requireRecruiter,
  validate(applicationIdParamSchema, "params"),
  validate(updateApplicationInterviewSchema),
  ownApplicationGuard,
  applicationController.updateInterview,
);
// Rescoring is an AI feature, gated Pro — the applicant's own initial score
// (scheduled automatically on apply) is still gated separately, in the
// service layer, since that path has no recruiter caller to check.
router.post(
  "/:id/rescore",
  ...requireRecruiter,
  requirePro,
  validate(applicationIdParamSchema, "params"),
  ownApplicationGuard,
  applicationController.rescore,
);
router.post(
  "/:id/assign-interviewer",
  ...requireRecruiter,
  validate(assignInterviewerSchema),
  ownApplicationGuard,
  applicationController.assignInterviewer,
);

// Scorecards reuse ownApplicationGuard, so submitting or reading an
// evaluation is scoped through the application's job to the caller's company
// exactly like a stage change is. A recruiter at another company gets the
// same 404 they would get for any other application they cannot see.
// Interview scorecards are a Pro feature.
router.put(
  "/:id/scorecard",
  ...requireRecruiter,
  requirePro,
  validate(applicationIdParamSchema, "params"),
  validate(submitScorecardSchema),
  ownApplicationGuard,
  applicationController.submitScorecard,
);
router.get(
  "/:id/scorecards",
  ...requireRecruiter,
  requirePro,
  validate(applicationIdParamSchema, "params"),
  ownApplicationGuard,
  applicationController.getScorecards,
);

export { router as applicationRouter };
