import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const recruiterReportQuerySchema = z
  .object({
    from: isoDate,
    to: isoDate,
    jobId: z.string().uuid().optional(),
    format: z.enum(["json", "csv"]).default("json"),
  })
  .superRefine((value, context) => {
    const from = new Date(`${value.from}T00:00:00.000Z`);
    const to = new Date(`${value.to}T00:00:00.000Z`);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from.toISOString().slice(0, 10) !== value.from ||
      to.toISOString().slice(0, 10) !== value.to
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date range" });
    } else if (from > to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "to must be on or after from",
      });
    }
  });

export type RecruiterReportQuery = z.infer<typeof recruiterReportQuerySchema>;
