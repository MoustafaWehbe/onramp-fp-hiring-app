import { Router } from "express";
import { validate } from "../middleware/validate";

import { skillController } from "../controllers/skills.controllers";
import { createSkillSchema } from "../schemas/skills.schemas";

const router = Router();

router.post(
  "/",
  validate(createSkillSchema),
  skillController.create,
);

export { router as skillRouter };