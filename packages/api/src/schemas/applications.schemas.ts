import { z } from "zod";

export const updateApplicationStageSchema = z.object({
  stage: z.enum([
    "REVIEWED",
    "INTERVIEWING",
    "OFFER",
    "HIRED",
    "REJECTED",
  ]),
});
export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().optional(),
});
export const assignInterviewerSchema =
  z.object({
    interviewerId: z.string().uuid(),
  });