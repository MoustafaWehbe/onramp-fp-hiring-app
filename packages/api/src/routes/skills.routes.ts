import { Router } from "express";
import { validate } from "../middleware/validate";

import { skillController } from "../controllers/skills.controllers";
import {
  createSkillSchema,
  searchSkillsSchema,
} from "../schemas/skills.schemas";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

const router = Router();
const requireSkillEditor = [
  authenticate,
  authorize("CANDIDATE", "RECRUITER", "ADMIN"),
];

router.get(
  "/",
  ...requireSkillEditor,
  validate(searchSkillsSchema, "query"),
  skillController.search,
);

router.post(
  "/",
  ...requireSkillEditor,
  validate(createSkillSchema),
  skillController.create,
);

export { router as skillRouter };
