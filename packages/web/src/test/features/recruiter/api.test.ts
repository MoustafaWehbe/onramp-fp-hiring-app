import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRecruiterCandidate,
  getRecruiterCandidates,
  getRecruiterDashboard,
} from "@/features/recruiter/api";

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recruiter workspace API", () => {
  it.each([
    ["dashboard", getRecruiterDashboard, "/recruiter/dashboard"],
    ["candidate list", getRecruiterCandidates, "/candidate-profiles"],
  ])("unwraps the %s response", async (_label, request, path) => {
    const payload = { sample: true };
    apiGet.mockResolvedValue({ data: { data: payload } });

    await expect(request()).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith(path);
  });

  it("loads one company-visible candidate", async () => {
    const payload = { id: "candidate-profile-1" };
    apiGet.mockResolvedValue({ data: { data: payload } });

    await expect(
      getRecruiterCandidate("candidate-profile-1"),
    ).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith(
      "/candidate-profiles/candidate-profile-1",
    );
  });
});
