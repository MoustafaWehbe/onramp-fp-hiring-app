import type { Request } from "express";
import { User } from "@starter-kit/shared/db";

/**
 * The caller's own company id, used as the getCallerId input to
 * ownershipGuard for company-scoped resources (jobs, applications, the
 * company profile itself). Not carried on the JWT, so this is a DB lookup
 * rather than a plain req.user field read.
 */
export const getCallerCompanyId = async (
  req: Request,
): Promise<string | null | undefined> => {
  if (!req.user) {
    return undefined;
  }

  const caller = await User.findByPk(req.user.userId);
  return caller?.companyId;
};
