import { Router, type RequestHandler } from "express";
import { companyController } from "../controllers/company.controller";
import { companyIdParamSchema } from "../schemas/company.schemas";
import { createError } from "../middleware/error-handler";

const router = Router();

/**
 * Rejects a malformed company id before it reaches Postgres, which would
 * otherwise raise an invalid-uuid error and surface as a 500.
 *
 * Deliberately 404 rather than the 422 validate() returns: this id comes from
 * a URL a candidate was handed, so a mistyped link should read the same as a
 * company that no longer exists, and shouldn't advertise that the id was
 * structurally wrong.
 */
const requireCompanyId: RequestHandler = (req, _res, next) => {
  const result = companyIdParamSchema.safeParse(req.params);
  next(result.success ? undefined : createError("Company not found", 404));
};

router.get(
  "/companies/:companyId/careers",
  requireCompanyId,
  companyController.getPublicCareerPage,
);

export { router as publicRouter };
