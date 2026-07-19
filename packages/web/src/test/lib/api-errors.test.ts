import { describe, it, expect } from "vitest";
import { getApiErrorMessage, getApiFieldErrors } from "../../lib/api-errors";

function fakeAxiosError(response?: { status: number; data: unknown }) {
  return {
    isAxiosError: true,
    message: "Request failed",
    response,
  };
}

describe("getApiErrorMessage", () => {
  it("joins field-level validation messages", () => {
    const error = fakeAxiosError({
      status: 422,
      data: {
        error: "Validation failed",
        errors: [
          { field: "startDate", message: "date cannot be in the future" },
          { field: "endDate", message: "endDate must be after startDate" },
        ],
      },
    });

    expect(getApiErrorMessage(error, "fallback")).toBe(
      "date cannot be in the future endDate must be after startDate",
    );
  });

  it("uses the plain error message when there are no field errors", () => {
    const error = fakeAxiosError({ status: 409, data: { error: "Profile already exists" } });
    expect(getApiErrorMessage(error, "fallback")).toBe("Profile already exists");
  });

  it("returns a connectivity message when there is no response at all", () => {
    const error = fakeAxiosError(undefined);
    expect(getApiErrorMessage(error, "fallback")).toMatch(/can't reach/i);
  });

  it("falls back for a non-axios error", () => {
    expect(getApiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });

  it("falls back when the response body has neither error nor errors", () => {
    const error = fakeAxiosError({ status: 500, data: {} });
    expect(getApiErrorMessage(error, "fallback")).toBe("fallback");
  });
});

describe("getApiFieldErrors", () => {
  it("extracts the field errors array", () => {
    const error = fakeAxiosError({
      status: 422,
      data: { errors: [{ field: "title", message: "Title is required" }] },
    });

    expect(getApiFieldErrors(error)).toEqual([
      { field: "title", message: "Title is required" },
    ]);
  });

  it("returns an empty array when there are none", () => {
    const error = fakeAxiosError({ status: 409, data: { error: "Conflict" } });
    expect(getApiFieldErrors(error)).toEqual([]);
  });

  it("returns an empty array for a non-axios error", () => {
    expect(getApiFieldErrors(new Error("boom"))).toEqual([]);
  });
});
