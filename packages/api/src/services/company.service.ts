import { getSequelize, Company, User } from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

interface CompanyInput {
  name: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

interface CompanyUpdateInput {
  name?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

export class CompanyService {
  serialize(company: Company) {
    return {
      id: company.id,
      name: company.name,
      website: company.website,
      description: company.description,
      logoUrl: company.logoUrl,
    };
  }

  async getById(id: string) {
    const company = await Company.findByPk(id);

    if (!company) {
      throw createError("Company not found", 404);
    }

    return this.serialize(company);
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
}

export const companyService = new CompanyService();
