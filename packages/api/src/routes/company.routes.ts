import { Router, type RequestHandler } from "express";
import { Company } from "@starter-kit/shared/db";
import { companyController } from "../controllers/company.controller";
import { validate } from "../middleware/validate";
import {
  createCompanySchema,
  updateCompanySchema,
} from "../schemas/company.schemas";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { ownershipGuard } from "../lib/ownership";
import { getCallerCompanyId } from "../lib/company-membership";

const router = Router();

const requireRecruiter = [authenticate, authorize("RECRUITER", "ADMIN")];

// A company has no owner field of its own — ownership is "this is the
// company req.user.companyId points at", so the resource IS the caller's
// company id and getOwnerId just reads its own id back.
const ownCompanyGuard = ownershipGuard<Company>(
  (req) => Company.findByPk(req.params.id as string),
  {
    getOwnerId: (company) => company.id,
    getCallerId: getCallerCompanyId,
    resultKey: "company",
    notFoundMessage: "Company not found",
  },
);

const ownCompanyReadGuard: RequestHandler = (req, res, next) => {
  if (req.user?.role === "ADMIN") {
    next();
    return;
  }

  void ownCompanyGuard(req, res, next);
};

router.post(
  "/",
  ...requireRecruiter,
  validate(createCompanySchema),
  companyController.create,
);
router.get(
  "/me",
  ...requireRecruiter,
  companyController.getMe,
);
router.get(
  "/:id",
  ...requireRecruiter,
  ownCompanyReadGuard,
  companyController.getById,
);
router.put(
  "/:id",
  ...requireRecruiter,
  validate(updateCompanySchema),
  ownCompanyGuard,
  companyController.update,
);
export { router as companyRouter };
