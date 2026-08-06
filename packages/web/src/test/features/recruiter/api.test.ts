import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCandidateToPool,
  createRecruiterTag,
  deleteRecruiterTag,
  getRecruiterCandidate,
  getRecruiterCandidates,
  getRecruiterDashboard,
  getRecruiterTags,
  inviteCandidateToApply,
  removeCandidateFromPool,
  updateCandidatePool,
} from "@/features/recruiter/api";

const { apiDelete, apiGet, apiPatch, apiPost } = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    delete: apiDelete,
    get: apiGet,
    patch: apiPatch,
    post: apiPost,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("recruiter workspace API", () => {
  it.each([
    ["dashboard", getRecruiterDashboard, "/recruiter/dashboard"],
  ])("unwraps the %s response", async (_label, request, path) => {
    const payload = { sample: true };
    apiGet.mockResolvedValue({ data: { data: payload } });

    await expect(request()).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith(path);
  });

  it("loads the server-filtered company candidate list", async () => {
    const payload = [{ id: "candidate-profile-1" }];
    const filters = { tagId: "tag-1", minFitScore: 75 };
    apiGet.mockResolvedValue({ data: { data: payload } });

    await expect(getRecruiterCandidates(filters)).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith("/recruiter/candidates", {
      params: filters,
    });
  });

  it("loads one company-visible candidate", async () => {
    const payload = { id: "candidate-profile-1" };
    apiGet.mockResolvedValue({ data: { data: payload } });

    await expect(
      getRecruiterCandidate("candidate-profile-1"),
    ).resolves.toEqual(payload);
    expect(apiGet).toHaveBeenCalledWith(
      "/recruiter/candidates/candidate-profile-1",
    );
  });

  it("creates, lists, and deletes company tags", async () => {
    const tag = { id: "tag-1", label: "Strong culture fit" };
    apiGet.mockResolvedValue({ data: { data: [tag] } });
    apiPost.mockResolvedValue({ data: { data: tag } });
    apiDelete.mockResolvedValue({});

    await expect(getRecruiterTags()).resolves.toEqual([tag]);
    await expect(createRecruiterTag(tag.label)).resolves.toEqual(tag);
    await deleteRecruiterTag(tag.id);

    expect(apiGet).toHaveBeenCalledWith("/recruiter/tags");
    expect(apiPost).toHaveBeenCalledWith("/recruiter/tags", {
      label: tag.label,
    });
    expect(apiDelete).toHaveBeenCalledWith("/recruiter/tags/tag-1");
  });

  it("adds, updates, and removes a candidate pool entry", async () => {
    const entry = { id: "entry-1", notes: "Revisit", tags: [] };
    const variables = {
      candidateId: "candidate-profile-1",
      input: { notes: "Revisit", tagIds: ["tag-1"] },
    };
    apiPost.mockResolvedValue({ data: { data: entry } });
    apiPatch.mockResolvedValue({ data: { data: entry } });
    apiDelete.mockResolvedValue({});

    await expect(addCandidateToPool(variables)).resolves.toEqual(entry);
    await expect(updateCandidatePool(variables)).resolves.toEqual(entry);
    await removeCandidateFromPool(variables.candidateId);

    const path = "/recruiter/candidates/candidate-profile-1/pool";
    expect(apiPost).toHaveBeenCalledWith(path, variables.input);
    expect(apiPatch).toHaveBeenCalledWith(path, variables.input);
    expect(apiDelete).toHaveBeenCalledWith(path);
  });

  it("sends an invite without creating an application request", async () => {
    const notification = { id: "notification-1", type: "invite_to_apply" };
    apiPost.mockResolvedValue({ data: { data: notification } });

    await expect(
      inviteCandidateToApply({
        candidateId: "candidate-profile-1",
        jobId: "job-1",
      }),
    ).resolves.toEqual(notification);
    expect(apiPost).toHaveBeenCalledWith(
      "/recruiter/candidates/candidate-profile-1/invite",
      { jobId: "job-1" },
    );
  });
});
