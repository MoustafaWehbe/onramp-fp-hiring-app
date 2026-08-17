import type { Request } from "express";
import { Company, User, type SubscriptionTier } from "@starter-kit/shared/db";

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

/** A company's current subscription tier, or undefined if the company (or
 * companyId itself) doesn't exist. */
export const getCompanySubscriptionTier = async (
  companyId?: string | null,
): Promise<SubscriptionTier | undefined> => {
  if (!companyId) {
    return undefined;
  }

  const company = await Company.findByPk(companyId, {
    attributes: ["subscriptionTier"],
  });
  return company?.subscriptionTier;
};

export const isCompanyPro = async (
  companyId?: string | null,
): Promise<boolean> => (await getCompanySubscriptionTier(companyId)) === "PRO";
