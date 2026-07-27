import { z } from "zod";

export const jobIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

const MAX_SALARY = 1_000_000_000;
const MAX_EXPERIENCE = 100;

const skillNamesSchema = z
  .array(z.string().trim().min(1).max(100))
  .min(1, "At least one skill is required")
  .max(20, "A job can have at most 20 skills")
  .transform((skills) => {
    const seen = new Set<string>();

    return skills.filter((skill) => {
      const key = skill.toLocaleLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  });

const sharedJobFields = {
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(50_000),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  experienceMin: z.number().int().min(0).max(MAX_EXPERIENCE),
  experienceMax: z.number().int().min(0).max(MAX_EXPERIENCE),
  location: z.string().trim().max(255).optional(),
  isRemote: z.boolean(),
  salaryMin: z.number().int().min(0).max(MAX_SALARY),
  salaryMax: z.number().int().min(0).max(MAX_SALARY),
  salaryCurrency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "salaryCurrency must be a 3-letter code")
    .transform((value) => value.toUpperCase()),
  skills: skillNamesSchema,
};

const createJobFields = {
  ...sharedJobFields,
  status: z.enum(["DRAFT", "OPEN"]),
};

const updateJobFields = {
  ...sharedJobFields,
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
};

function validateRanges(
  input: {
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
  },
  ctx: z.RefinementCtx,
) {
  if (
    input.experienceMin !== undefined &&
    input.experienceMax !== undefined &&
    input.experienceMax < input.experienceMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["experienceMax"],
      message: "experienceMax must be greater than or equal to experienceMin",
    });
  }

  if (
    input.salaryMin !== undefined &&
    input.salaryMax !== undefined &&
    input.salaryMax < input.salaryMin
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salaryMax"],
      message: "salaryMax must be greater than or equal to salaryMin",
    });
  }
}

function validateCreateJob(
  input: {
    experienceMin: number;
    experienceMax: number;
    salaryMin: number;
    salaryMax: number;
    isRemote: boolean;
    location?: string;
  },
  ctx: z.RefinementCtx,
) {
  validateRanges(input, ctx);

  if (!input.isRemote && !input.location?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["location"],
      message: "location is required when isRemote is false",
    });
  }
}

function validatePartialJob(
  input: {
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
    isRemote?: boolean;
    location?: string;
  },
  ctx: z.RefinementCtx,
) {
  validateRanges(input, ctx);

  if (
    input.isRemote === false &&
    input.location !== undefined &&
    !input.location.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["location"],
      message: "location is required when isRemote is false",
    });
  }
}

export const createJobSchema = z
  .object(createJobFields)
  .superRefine(validateCreateJob);

// Only these fields are recruiter-editable. Zod strips unknown keys before
// validate() replaces req.body, so ownership metadata can never reach the
// model update call.
export const updateJobSchema = z
  .object(updateJobFields)
  .partial()
  .superRefine(validatePartialJob);
