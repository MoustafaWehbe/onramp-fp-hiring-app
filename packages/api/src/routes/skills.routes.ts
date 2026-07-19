import { Router } from "express";
import { validate } from "../middleware/validate";

import { skillController } from "../controllers/skills.controllers";
import { createSkillSchema } from "../schemas/skills.schemas";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  validate(createSkillSchema),
  skillController.create,
);

export { router as skillRouter };