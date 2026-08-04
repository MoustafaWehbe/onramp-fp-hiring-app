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
