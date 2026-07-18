import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

export const createProfileSchema = z.object({
  headline: z.string().max(255).optional(),
  bio: z.string().optional(),
  phone: z.string().max(30).optional(),
  location: z.string().max(255).optional(),
});

export const updateProfileSchema = createProfileSchema.partial();

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDate(date: string): boolean {
  return date > todayIsoDate();
}

/**
 * Shared cross-field rules for both create (startDate required) and update
 * (everything optional) — a partial update only validates the fields it was
 * given; checking endDate against a startDate the request didn't include
 * would require the DB row, which is out of scope for schema validation.
 */
function checkExperienceDates(
  data: { startDate?: string; endDate?: string },
  ctx: z.RefinementCtx,
): void {
  if (data.startDate !== undefined && isFutureDate(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "date cannot be in the future",
      path: ["startDate"],
    });
  }

  if (data.endDate !== undefined) {
    if (isFutureDate(data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "date cannot be in the future",
        path: ["endDate"],
      });
    }

    // endDate is optional — null/absent means "current role" — but when it
    // IS given, it must not precede startDate.
    if (data.startDate !== undefined && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be after startDate",
        path: ["endDate"],
      });
    }
  }
}

const experienceFieldsSchema = z.object({
  company: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  startDate: isoDate,
  endDate: isoDate.optional(),
  description: z.string().optional(),
});

export const createExperienceSchema =
  experienceFieldsSchema.superRefine(checkExperienceDates);

export const updateExperienceSchema = experienceFieldsSchema
  .partial()
  .superRefine(checkExperienceDates);

export const idParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const setSkillsSchema = z.object({
  skillIds: z.array(z.string().uuid("each skillId must be a valid UUID")).max(50),
});
