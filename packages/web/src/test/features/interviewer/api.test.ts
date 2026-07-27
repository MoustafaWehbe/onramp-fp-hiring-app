import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyAssignments } from "@/features/interviewer/api";

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interviewer assignments API", () => {
  it("loads and unwraps the signed-in interviewer's assignments", async () => {
    const assignments = [{ id: "assignment-1" }];
    apiGet.mockResolvedValue({ data: { data: assignments } });

    await expect(getMyAssignments()).resolves.toEqual(assignments);
    expect(apiGet).toHaveBeenCalledWith("/interviewer/assignments/me");
  });
});
