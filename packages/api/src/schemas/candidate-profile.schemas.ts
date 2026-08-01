import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be formatted YYYY-MM-DD");

const httpUrl = z
  .string()
  .trim()
  .url("Links must be valid URLs")
  .max(2048)
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Links must start with http:// or https://",
  );

/**
 * Free-form labels so a candidate can add whatever they actually have —
 * GitHub, a portfolio, Dribbble — rather than picking from a fixed list that
 * would always be missing someone's.
 */
export const profileLinksSchema = z
  .record(z.string().trim().min(1).max(40), httpUrl)
  .refine(
    (links) => Object.keys(links).length <= 10,
    "A profile can have at most 10 links",
  );

export const updateProfileExtrasSchema = z.object({
  links: profileLinksSchema.nullable().optional(),
  profilePhotoUrl: httpUrl.nullable().optional(),
});

export const createEducationSchema = z
  .object({
    institution: z.string().trim().min(1).max(255),
    degree: z.string().trim().max(255).nullable().optional(),
    fieldOfStudy: z.string().trim().max(255).nullable().optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
  })
  .refine(
    (entry) => !entry.endDate || entry.endDate >= entry.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );

export const updateEducationSchema = z
  .object({
    institution: z.string().trim().min(1).max(255).optional(),
    degree: z.string().trim().max(255).nullable().optional(),
    fieldOfStudy: z.string().trim().max(255).nullable().optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.nullable().optional(),
  })
  .refine(
    (entry) => Object.keys(entry).length > 0,
    "Provide at least one field to update",
  );

export const easyApplySchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().trim().max(5_000).optional(),
});

export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});
