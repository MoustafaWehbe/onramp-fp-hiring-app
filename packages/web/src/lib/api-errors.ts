import { isAxiosError } from "axios";

export interface FieldError {
  field: string;
  message: string;
}

interface ApiErrorBody {
  error?: string;
  errors?: FieldError[];
  /** Machine-readable identifier, e.g. "UPGRADE_REQUIRED" — see createError's
   * optional code param in error-handler.ts. Most errors don't have one. */
  code?: string;
}

/**
 * Backend error shapes (packages/api/src/middleware/{validate,error-handler}.ts):
 *  - Zod validation failures: { error: "Validation failed", errors: [{field, message}] }
 *  - Everything else (createError):                          { error: "<message>", code?: "<CODE>" }
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

/**
 * True when the server rejected a request specifically because the caller's
 * company is on the Free plan. Defense-in-depth for surfaces that aren't
 * proactively lock-gated in the UI — e.g. a stale cached tier racing a
 * downgrade, or a bulk action whose lock state wasn't checked client-side.
 */
export function isUpgradeRequiredError(error: unknown): boolean {
  if (!isAxiosError(error) || !error.response) {
    return false;
  }

  const body = error.response.data as ApiErrorBody | undefined;
  return body?.code === "UPGRADE_REQUIRED";
}
