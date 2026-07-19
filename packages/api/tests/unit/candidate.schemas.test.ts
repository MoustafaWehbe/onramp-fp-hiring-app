import {
  createExperienceSchema,
  updateExperienceSchema,
} from "../../src/schemas/candidate.schemas";

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const YESTERDAY = daysFromToday(-1);
const TODAY = daysFromToday(0);
const TOMORROW = daysFromToday(1);
const LAST_WEEK = daysFromToday(-7);
const LAST_YEAR = daysFromToday(-365);

function issueMessages(result: { success: boolean; error?: { errors: { message: string }[] } }) {
  return result.error?.errors.map((e) => e.message) ?? [];
}

// ─── createExperienceSchema ────────────────────────────────────────────────────

describe("createExperienceSchema", () => {
  it("accepts a current role: startDate in the past, no endDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: LAST_YEAR,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a past role: startDate and endDate both in the past, endDate after startDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: LAST_YEAR,
      endDate: LAST_WEEK,
    });

    expect(result.success).toBe(true);
  });

  it("accepts endDate equal to startDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: LAST_WEEK,
      endDate: LAST_WEEK,
    });

    expect(result.success).toBe(true);
  });

  it("accepts startDate === today (today is not 'in the future')", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: TODAY,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a future startDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: TOMORROW,
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("date cannot be in the future");
  });

  it("rejects a future endDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: LAST_WEEK,
      endDate: TOMORROW,
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("date cannot be in the future");
  });

  it("rejects endDate before startDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: LAST_WEEK,
      endDate: LAST_YEAR, // definitely earlier than LAST_WEEK
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("endDate must be after startDate");
  });

  it("rejects a missing startDate", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
    });

    expect(result.success).toBe(false);
  });

  it("can report multiple issues at once (future startDate AND endDate before startDate)", () => {
    const result = createExperienceSchema.safeParse({
      company: "Northwind Labs",
      title: "Engineer",
      startDate: TOMORROW,
      endDate: TODAY,
    });

    expect(result.success).toBe(false);
    const messages = issueMessages(result);
    expect(messages).toContain("date cannot be in the future");
    expect(messages).toContain("endDate must be after startDate");
  });
});

// ─── updateExperienceSchema (PATCH) ────────────────────────────────────────────

describe("updateExperienceSchema", () => {
  it("still allows a partial update with neither date field (endDate stays optional)", () => {
    const result = updateExperienceSchema.safeParse({ title: "Staff Engineer" });
    expect(result.success).toBe(true);
  });

  it("allows setting endDate alone when it is not in the future (no startDate to compare against in this payload)", () => {
    const result = updateExperienceSchema.safeParse({ endDate: LAST_WEEK });
    expect(result.success).toBe(true);
  });

  it("rejects a future endDate on its own", () => {
    const result = updateExperienceSchema.safeParse({ endDate: TOMORROW });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("date cannot be in the future");
  });

  it("rejects a future startDate on its own", () => {
    const result = updateExperienceSchema.safeParse({ startDate: TOMORROW });
    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("date cannot be in the future");
  });

  it("rejects endDate before startDate when both are given together", () => {
    const result = updateExperienceSchema.safeParse({
      startDate: LAST_WEEK,
      endDate: LAST_YEAR,
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("endDate must be after startDate");
  });

  it("accepts endDate === startDate when both are given together", () => {
    const result = updateExperienceSchema.safeParse({
      startDate: LAST_WEEK,
      endDate: LAST_WEEK,
    });

    expect(result.success).toBe(true);
  });
});
