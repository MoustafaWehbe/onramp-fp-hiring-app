import type { Request, Response, NextFunction } from "express";
import { getCallerCompanyId, isCompanyPro } from "../lib/company-membership";

/**
 * Gates a route to companies on the Pro subscription tier. Assumes it runs
 * after authentication (and typically after `authorize`/`requireRecruiter`)
 * so `req.user` is already populated.
 *
 * Returns 403 either when the caller has no company at all, or when their
 * company is on the Free tier — in the latter case with
 * `code: "UPGRADE_REQUIRED"` so clients can distinguish "you're not allowed"
 * from "you'd be allowed on a higher plan" without parsing the message.
 */
export const requirePro = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const companyId = await getCallerCompanyId(req);
    if (!companyId) {
      res
        .status(403)
        .json({ error: "You must belong to a company to use this feature" });
      return;
    }

    if (!(await isCompanyPro(companyId))) {
      res.status(403).json({
        error: "This feature requires a Pro subscription. Upgrade to unlock it.",
        code: "UPGRADE_REQUIRED",
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};
