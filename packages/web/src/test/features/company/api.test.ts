import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
} from "@/features/company/api";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "@/types/company";

const { apiGet, apiPost, apiPut } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
    put: apiPut,
  },
}));

const input: CompanyProfileInput = {
  name: "Northstar Labs",
  industry: "Developer tools",
  size: "11–50 employees",
  location: "Beirut, Lebanon",
  contact: "talent@northstar.example",
  website: "https://northstar.example",
};

const profile: CompanyProfile = {
  id: "company-1",
  ...input,
  website: input.website ?? null,
  description: null,
  logoUrl: null,
  profileComplete: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("company profile API", () => {
  it("loads the authenticated recruiter's company profile", async () => {
    apiGet.mockResolvedValue({ data: { data: profile } });

    await expect(getCompanyProfile()).resolves.toEqual(profile);
    expect(apiGet).toHaveBeenCalledWith("/companies/me");
  });

  it("creates a company profile", async () => {
    apiPost.mockResolvedValue({ data: { data: profile } });

    await expect(createCompanyProfile(input)).resolves.toEqual(profile);
    expect(apiPost).toHaveBeenCalledWith("/companies", input);
  });

  it("updates the caller-owned company profile", async () => {
    apiPut.mockResolvedValue({ data: { data: profile } });

    await expect(
      updateCompanyProfile({ id: profile.id, input }),
    ).resolves.toEqual(profile);
    expect(apiPut).toHaveBeenCalledWith(`/companies/${profile.id}`, input);
  });
});
