import { z } from "zod";

export const createCandidateProfileSchema = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  resumeUrl: z.string().url().optional(),
});