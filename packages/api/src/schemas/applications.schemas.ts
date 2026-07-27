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

// POST /applications is a submission endpoint. stage, submittedAt,
// candidateProfileId, and resumeUrl are deliberately server-controlled.
export const assignInterviewerSchema =
  z.object({
    interviewerId: z.string().uuid(),
  });
