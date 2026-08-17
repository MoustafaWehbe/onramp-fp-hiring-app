import {
  getSequelize,
  Company,
  User,
  type SubscriptionTier,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";
// jobs.service imports isCompanyProfileComplete back from here, so these two
// form an import cycle. It is safe because both references are inside method
// bodies rather than at module scope — keep it that way.
import { jobService } from "./jobs.service";

interface CompanyInput {
  name: string;
  industry: string;
  size: string;
  location: string;
  contact: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

interface CompanyUpdateInput {
  name?: string;
  industry?: string;
  size?: string;
  location?: string;
  contact?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

export function isCompanyProfileComplete(company: Company): boolean {
  return [
    company.name,
    company.industry,
    company.size,
    company.location,
    company.contact,
  ].every((value) => typeof value === "string" && value.trim().length > 0);
}

export class CompanyService {
  serialize(company: Company) {
    return {
      id: company.id,
      name: company.name,
      industry: company.industry ?? null,
      size: company.size ?? null,
      location: company.location ?? null,
      contact: company.contact ?? null,
      website: company.website ?? null,
      description: company.description ?? null,
      logoUrl: company.logoUrl ?? null,
      profileComplete: isCompanyProfileComplete(company),
      subscriptionTier: company.subscriptionTier,
      subscriptionStartedAt: company.subscriptionStartedAt ?? null,
      subscriptionUpdatedAt: company.subscriptionUpdatedAt ?? null,
    };
  }

  async getById(id: string) {
    const company = await Company.findByPk(id);

    if (!company) {
      throw createError("Company not found", 404);
    }

    return this.serialize(company);
  }
  /**
   * What an anonymous visitor may see of a company.
   *
   * Deliberately narrower than serialize(): the hiring contact, industry, size,
   * location and the internal profileComplete flag are for the authenticated,
   * ownership-guarded endpoints only. This is the same allow-list the public
   * jobs feed already embeds, so the two agree on what "public company" means.
   */
  serializePublic(company: Company) {
    return {
      id: company.id,
      name: company.name,
      website: company.website ?? null,
      logoUrl: company.logoUrl ?? null,
      description: company.description ?? null,
    };
  }

  async getPublicCareerPage(companyId: string) {
    const company = await Company.findByPk(companyId);

    if (!company) {
      throw createError("Company not found", 404);
    }

    return {
      company: this.serializePublic(company),
      // Delegated rather than queried here, so a careers page and the jobs
      // browse page can never disagree about which jobs are public or which
      // fields a public job has.
      jobs: await jobService.getPublic({ companyId }),
    };
  }

  async getForCaller(companyId: string | null | undefined) {
    if (!companyId) {
      throw createError("Company not found for caller", 404);
    }

    return this.getById(companyId);
  }

  async getByOwner(ownerId: string) {
    const owner = await User.findByPk(ownerId);

    if (!owner?.companyId) {
      throw createError("Company not found for caller", 404);
    }

    return this.getById(owner.companyId);
  }

  async create(input: CompanyInput, ownerId: string) {
    const owner = await User.findByPk(ownerId);

    if (!owner) {
      throw createError("User not found", 404);
    }

    if (owner.companyId) {
      throw createError("Company already exists", 409);
    }

    const company = await getSequelize().transaction(async (transaction) => {
      const created = await Company.create(input, { transaction });

      await User.update(
        { companyId: created.id },
        { where: { id: ownerId }, transaction },
      );

      return created;
    });

    return this.serialize(company);
  }

  async update(id: string, input: CompanyUpdateInput) {
    const company = await Company.findByPk(id);

    if (!company) {
      throw createError("Company not found", 404);
    }

    await company.update(input);

    return this.serialize(company);
  }

  // PAYMENT INTEGRATION SEAM: this phase upgrades/downgrades instantly with
  // no payment step. A real billing integration attaches here — before the
  // tier actually flips — to authorize/charge before granting PRO, and to
  // handle webhook-driven downgrades on payment failure/cancellation.
  async updateSubscription(companyId: string, tier: SubscriptionTier) {
    const company = await Company.findByPk(companyId);

    if (!company) {
      throw createError("Company not found", 404);
    }

    const now = new Date();
    const becamePro = tier === "PRO" && company.subscriptionTier !== "PRO";

    await company.update({
      subscriptionTier: tier,
      subscriptionUpdatedAt: now,
      ...(becamePro ? { subscriptionStartedAt: now } : {}),
    });

    return this.serialize(company);
  }
}

export const companyService = new CompanyService();
