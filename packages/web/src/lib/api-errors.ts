import { isAxiosError } from "axios";

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorBody {
  error?: string;
  errors?: FieldError[];
}

/**
 * Backend error shapes (packages/api/src/middleware/{validate,error-handler}.ts):
 *  - Zod validation failures: { error: "Validation failed", errors: [{field, message}] }
 *  - Everything else (createError):                          { error: "<message>" }
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return "Can't reach the HireFlow API right now. Check your connection and try again.";
  }

  const body = error.response.data as ApiErrorBody | undefined;

  if (body?.errors && body.errors.length > 0) {
    return body.errors.map((e) => e.message).join(" ");
  }

  return body?.error ?? fallback;
}

/** Field-level messages from a Zod validation 422, for react-hook-form's setError. */
export function getApiFieldErrors(error: unknown): FieldError[] {
  if (!isAxiosError(error) || !error.response) {
    return [];
  }

  const body = error.response.data as ApiErrorBody | undefined;
  return body?.errors ?? [];
}
