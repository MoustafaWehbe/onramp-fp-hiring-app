import { Router } from "express";
import { companyController } from "../controllers/company.controller";
import { validate } from "../middleware/validate";
import { createCompanySchema , updateCompanySchema } from "../schemas/company.schemas";

const router = Router();

router.post(
  "/",
  validate(createCompanySchema),
  companyController.create,
);
router.put(
  "/:id",
  validate(updateCompanySchema),
  companyController.update,
);
export { router as companyRouter };