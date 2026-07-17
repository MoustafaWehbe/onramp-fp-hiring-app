import { z } from "zod";

export const createJobSchema = z.object({
  companyId: z.string().uuid(),
  createdById: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  location: z.string().optional(),
});