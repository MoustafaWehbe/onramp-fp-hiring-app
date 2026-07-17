import { Router } from "express";

import { validate } from "../middleware/validate";

import { jobSkillController }
  from "../controllers/job-skills.controllers";

import { attachSkillsSchema }
  from "../schemas/job-skills.schemas";

const router = Router();

router.post(
  "/:jobId/skills",
  validate(attachSkillsSchema),
  jobSkillController.attachSkills,
);

export { router as jobSkillRouter };