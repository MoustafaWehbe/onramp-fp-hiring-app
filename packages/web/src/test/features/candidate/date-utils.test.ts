import { describe, it, expect } from "vitest";
import { formatDateOnly, todayIsoDate } from "../../../features/candidate/date-utils";

describe("formatDateOnly", () => {
  it("formats a DATE-only string without a timezone-induced day shift", () => {
    // A naive `new Date("2021-03-01")` parses as UTC midnight, which renders
    // as Feb 28 in negative-UTC-offset timezones — this must not happen.
    expect(formatDateOnly("2021-03-01")).toBe("Mar 1, 2021");
  });

  it("formats the first and last day of a month correctly", () => {
    expect(formatDateOnly("2024-01-01")).toBe("Jan 1, 2024");
    expect(formatDateOnly("2024-12-31")).toBe("Dec 31, 2024");
  });
});

describe("todayIsoDate", () => {
  it("returns today's date in YYYY-MM-DD format", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches a locally-constructed today string", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayIsoDate()).toBe(expected);
  });
});
