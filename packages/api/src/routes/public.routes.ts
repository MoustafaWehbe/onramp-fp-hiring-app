import { Router } from "express";
import { companyController } from "../controllers/company.controller";

const router = Router();

router.get(
  "/companies/:companyId/careers",
  companyController.getPublicCareerPage,
);

export { router as publicRouter };