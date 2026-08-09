import { z } from "zod";
import { RATING_MAX, RATING_MIN } from "@starter-kit/shared/db";

export const scorecardTemplateIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    // An emptied textarea arrives as "" and means "no comment", which is the
    // same thing the column stores as NULL.
    .transform((value) => (value.length === 0 ? null : value))
    .nullish();

/**
 * A criterion in a template write.
 *
 * `id` is what distinguishes an edit from an addition: present means "this is
 * the existing criterion, keep its ratings"; absent means "create a new one".
 * Anything the client omits from the array is a removal — which is why the
 * service checks for existing ratings before honouring it.
 */
const criterionInputSchema = z.object({
  id: z.string().uuid("criterion id must be a valid UUID").optional(),
  label: z
    .string()
    .trim()
    .min(1, "Criterion label is required")
    .max(255, "Criterion label must be 255 characters or fewer"),
  description: optionalText("Criterion description", 2_000),
});

export const createScorecardTemplateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must be 255 characters or fewer"),
  // A template with no criteria could be submitted against but would produce
  // no scores, so the empty case is rejected rather than stored.
  criteria: z
    .array(criterionInputSchema)
    .min(1, "A template needs at least one criterion")
    .max(20, "A template can hold at most 20 criteria"),
});

/**
 * Update replaces the whole criteria list rather than patching it. Ordering is
 * taken from array position, so reordering is just sending the array in the
 * new order — no separate move endpoint, and no chance of two criteria
 * claiming the same position.
 */
export const updateScorecardTemplateSchema = createScorecardTemplateSchema;

export const submitScorecardSchema = z.object({
  templateId: z.string().uuid("templateId must be a valid UUID"),
  ratings: z
    .array(
      z.object({
        criterionId: z.string().uuid("criterionId must be a valid UUID"),
        rating: z
          .number()
          .int("rating must be a whole number")
          .min(RATING_MIN, `rating must be between ${RATING_MIN} and ${RATING_MAX}`)
          .max(RATING_MAX, `rating must be between ${RATING_MIN} and ${RATING_MAX}`),
        comment: optionalText("Comment", 2_000),
      }),
    )
    .min(1, "Score at least one criterion"),
  overallComment: optionalText("Overall comment", 4_000),
});
