import { z } from "zod";

export const applicationIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * A sanity window, not a business rule: a recruiter may back-date a interview
 * that already happened, but a date years out of range is a client bug or a
 * typo rather than a real schedule.
 */
export const INTERVIEW_DATE_MAX_PAST_MS = 365 * DAY_MS;
export const INTERVIEW_DATE_MAX_FUTURE_MS = 2 * 365 * DAY_MS;

const interviewDateSchema = z
  .string()
  .datetime({
    offset: true,
    message: "interviewDate must be an ISO 8601 datetime",
  })
  // An unparseable value already failed .datetime(); skipping it here keeps
  // one bad string from reporting three separate errors.
  .refine(
    (value) => {
      const parsed = Date.parse(value);
      return (
        Number.isNaN(parsed) ||
        parsed >= Date.now() - INTERVIEW_DATE_MAX_PAST_MS
      );
    },
    { message: "interviewDate is too far in the past" },
  )
  .refine(
    (value) => {
      const parsed = Date.parse(value);
      return (
        Number.isNaN(parsed) ||
        parsed <= Date.now() + INTERVIEW_DATE_MAX_FUTURE_MS
      );
    },
    { message: "interviewDate is too far in the future" },
  );

const recruiterNotesSchema = z
  .string()
  .max(10_000, "recruiterNotes must be 10000 characters or fewer");

export const updateApplicationStageSchema = z.object({
  stage: z.enum([
    "REVIEWED",
    "INTERVIEWING",
    "OFFER",
    "HIRED",
    "REJECTED",
  ]),
  // Optional so a stage change never depends on a date being agreed. Present
  // only so "move to interviewing and schedule" is a single atomic request.
  interviewDate: interviewDateSchema.nullable().optional(),
});

// interviewDate and recruiterNotes are independently optional: either can be
// set, changed, or cleared (explicit null) on its own, at any stage.
export const updateApplicationInterviewSchema = z
  .object({
    interviewDate: interviewDateSchema.nullable().optional(),
    recruiterNotes: recruiterNotesSchema.nullable().optional(),
  })
  .refine(
    (body) =>
      body.interviewDate !== undefined || body.recruiterNotes !== undefined,
    { message: "Provide interviewDate, recruiterNotes, or both" },
  );
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
