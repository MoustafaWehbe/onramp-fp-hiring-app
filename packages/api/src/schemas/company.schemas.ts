import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  website: z.string().url().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});
export const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});