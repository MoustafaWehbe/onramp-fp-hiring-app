import { Company } from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";
export class CompanyService {
  async create(input: {
    name: string;
    website?: string;
    description?: string;
    logoUrl?: string;
  }) {
    const company = await Company.create(input);

    return {
      id: company.id,
      name: company.name,
      website: company.website,
      description: company.description,
      logoUrl: company.logoUrl,
    };
  }
   async update(
  id: string,
  input: {
    name?: string;
    website?: string;
    description?: string;
    logoUrl?: string;
  },
) {
  const company = await Company.findByPk(id);

  if (!company) {
    throw createError("Company not found", 404);
  }

  await company.update(input);

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    description: company.description,
    logoUrl: company.logoUrl,
  };
}
}

export const companyService = new CompanyService();