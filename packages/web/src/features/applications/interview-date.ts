/**
 * interviewDate is a real instant (an ISO 8601 timestamp), but
 * `<input type="datetime-local">` reads and writes wall-clock text with no
 * zone. These two helpers are the only place that conversion happens, so a
 * date shown to a recruiter always round-trips back to the same instant.
 */

/** ISO instant -> "YYYY-MM-DDTHH:mm" in the viewer's own timezone. */
export function toInterviewDateInput(
  interviewDate: string | null | undefined,
): string {
  if (!interviewDate) {
    return "";
  }

  const parsed = new Date(interviewDate);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  // toISOString() is UTC, so shift by the local offset first to keep the
  // wall-clock time the recruiter actually sees.
  const localMs = parsed.getTime() - parsed.getTimezoneOffset() * 60_000;
  return new Date(localMs).toISOString().slice(0, 16);
}

/**
 * Local "YYYY-MM-DDTHH:mm" -> ISO instant. An empty input is a cleared date,
 * which the API stores as null rather than an empty string.
 */
export function fromInterviewDateInput(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatInterviewDate(interviewDate: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(interviewDate));
}

/**
 * Day and month only — for the pipeline card's indicator row, where the full
 * form above would eat the whole line. The complete date still reaches the
 * recruiter through that indicator's tooltip and screen-reader label, so this
 * shortens what is shown without hiding anything.
 */
export function formatInterviewDateShort(interviewDate: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(interviewDate));
}
