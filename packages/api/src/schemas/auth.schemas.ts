import { z } from "zod";
import {
  SELF_ASSIGNABLE_ROLES,
  type SelfAssignableRole,
} from "@starter-kit/shared";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  // ADMIN is deliberately absent: admin accounts are granted only by the
  // seeder or by another admin, never self-assigned at registration.
  role: z
    .enum(
      SELF_ASSIGNABLE_ROLES as [SelfAssignableRole, ...SelfAssignableRole[]],
      {
        errorMap: () => ({
          message: "role must be one of CANDIDATE, RECRUITER, INTERVIEWER",
        }),
      },
    )
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
