import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  disconnectCalendar,
  getCalendarConnection,
  getRecruiterCalendar,
} from "@/features/calendar/api";

const { apiDelete, apiGet } = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet, delete: apiDelete },
}));

beforeEach(() => vi.clearAllMocks());

describe("calendar API", () => {
  it("loads the current recruiter's connection status", async () => {
    const connection = {
      configured: true,
      connected: true,
      googleEmail: "owner@example.com",
      connectedAt: "2026-08-07T10:00:00.000Z",
    };
    apiGet.mockResolvedValue({ data: { data: connection } });

    await expect(getCalendarConnection()).resolves.toEqual(connection);
    expect(apiGet).toHaveBeenCalledWith("/recruiter/calendar/connection");
  });

  it("loads the company interview calendar", async () => {
    const interviews = [{ applicationId: "application-1" }];
    apiGet.mockResolvedValue({ data: { data: interviews } });

    await expect(getRecruiterCalendar()).resolves.toEqual(interviews);
    expect(apiGet).toHaveBeenCalledWith("/recruiter/calendar");
  });

  it("disconnects the current recruiter's calendar", async () => {
    apiDelete.mockResolvedValue({});

    await expect(disconnectCalendar()).resolves.toBeUndefined();
    expect(apiDelete).toHaveBeenCalledWith("/recruiter/calendar/connection");
  });
});
