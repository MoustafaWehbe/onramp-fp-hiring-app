/**
 * Backend dates here are DATE-only strings ("2021-03-01"), not timestamps.
 * `new Date("2021-03-01")` parses as UTC midnight, so formatting it with the
 * viewer's local timezone can display the wrong day (e.g. Mar 1 shows as
 * Feb 28 in negative-UTC-offset zones). Building the Date from local
 * year/month/day components instead avoids that shift.
 */
export function formatDateOnly(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
