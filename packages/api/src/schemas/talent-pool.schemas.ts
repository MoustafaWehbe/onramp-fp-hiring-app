import { z } from "zod";

const optionalScore = z.coerce.number().min(0).max(100).optional();
const optionalAverage = z.coerce.number().min(1).max(5).optional();

export const recruiterCandidateFiltersSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    tagId: z.string().uuid().optional(),
    skill: z.string().trim().max(100).optional(),
    minFitScore: optionalScore,
    maxFitScore: optionalScore,
    minScorecardAverage: optionalAverage,
    maxScorecardAverage: optionalAverage,
    poolStatus: z.enum(["all", "in_pool", "not_in_pool"]).default("all"),
  })
  .superRefine((value, context) => {
    if (
      value.minFitScore !== undefined &&
      value.maxFitScore !== undefined &&
      value.minFitScore > value.maxFitScore
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxFitScore"],
        message: "maxFitScore must be greater than or equal to minFitScore",
      });
    }
    if (
      value.minScorecardAverage !== undefined &&
      value.maxScorecardAverage !== undefined &&
      value.minScorecardAverage > value.maxScorecardAverage
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxScorecardAverage"],
        message:
          "maxScorecardAverage must be greater than or equal to minScorecardAverage",
      });
    }
  });

export const candidateIdParamSchema = z.object({
  candidateId: z.string().uuid(),
});

export const tagIdParamSchema = z.object({
  tagId: z.string().uuid(),
});

export const createCandidateTagSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

const poolFields = {
  notes: z.string().trim().max(5000).nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(),
};

export const addCandidateToPoolSchema = z.object(poolFields);
export const updateCandidatePoolSchema = z
  .object(poolFields)
  .refine((value) => value.notes !== undefined || value.tagIds !== undefined, {
    message: "Provide notes or tagIds to update",
  });

export const inviteCandidateSchema = z.object({
  jobId: z.string().uuid(),
});

export type RecruiterCandidateFilters = z.infer<
  typeof recruiterCandidateFiltersSchema
>;
