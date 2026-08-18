import { z } from "zod";

const requiredSetupField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

export const createCompanySchema = z.object({
  name: requiredSetupField("Name", 255),
  industry: requiredSetupField("Industry", 255),
  size: requiredSetupField("Size", 100),
  location: requiredSetupField("Location", 255),
  contact: requiredSetupField("Contact", 255),
  website: z.string().trim().url().max(2048).optional(),
  description: z.string().trim().max(10_000).optional(),
  logoUrl: z.string().trim().url().max(2048).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyIdParamSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
});

// For routes shaped /companies/:id/..., where the param is named "id" rather
// than "companyId" (that name is reserved for the public careers route
// above). Do not reuse companyIdParamSchema against an :id route.
export const companyIdPathParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const updateSubscriptionSchema = z.object({
  tier: z.enum(["FREE", "PRO"]),
});
