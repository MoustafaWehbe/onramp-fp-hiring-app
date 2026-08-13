import { z } from "zod";

export const createSkillSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const searchSkillsSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "q must contain at least 2 characters")
    .max(100),
});
