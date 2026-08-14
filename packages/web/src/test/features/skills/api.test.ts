import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSkill, searchSkills } from "@/features/skills/api";

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet, post: apiPost },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("skills API", () => {
  it("searches the shared endpoint with cancellation support", async () => {
    const controller = new AbortController();
    const skills = [{ id: "skill-react", name: "React" }];
    apiGet.mockResolvedValue({ data: { data: skills } });

    await expect(searchSkills("rea", controller.signal)).resolves.toEqual(skills);
    expect(apiGet).toHaveBeenCalledWith("/skills", {
      params: { q: "rea" },
      signal: controller.signal,
    });
  });

  it("creates a skill on demand", async () => {
    const skill = { id: "skill-rust", name: "Rust" };
    apiPost.mockResolvedValue({ data: { data: skill } });

    await expect(createSkill("Rust")).resolves.toEqual(skill);
    expect(apiPost).toHaveBeenCalledWith("/skills", { name: "Rust" });
  });
});
