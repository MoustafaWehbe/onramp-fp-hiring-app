import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRecruiterJob,
  getPublicJob,
  getPublicJobs,
  getRecruiterJob,
  getRecruiterJobs,
  updateRecruiterJob,
} from "@/features/jobs/api";
import type {
  PublicJobRecord,
  RecruiterJobRecord,
} from "@/types/jobs";

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

const publicJob: PublicJobRecord = {
  id: "job-1",
  title: "Full-Stack Engineer",
  description: "Build thoughtful hiring software.",
  location: "Remote",
  status: "OPEN",
  createdAt: "2026-07-20T10:00:00.000Z",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 6,
  isRemote: true,
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  company: {
    id: "company-1",
    name: "Northstar Labs",
    website: "https://northstar.example",
    logoUrl: null,
  },
  skills: [
    { id: "skill-1", name: "React" },
    { id: "skill-2", name: "Node.js" },
  ],
};

const recruiterJob: RecruiterJobRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  createdById: "33333333-3333-4333-8333-333333333333",
  title: "Full-Stack Engineer",
  description: "Build thoughtful hiring software.",
  location: "Remote",
  status: "OPEN",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 6,
  isRemote: true,
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  skills: [{ id: "skill-1", name: "React" }],
  applicantCount: 4,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("public jobs API", () => {
  it("loads and unwraps the public OPEN jobs collection", async () => {
    apiGet.mockResolvedValue({ data: { data: [publicJob] } });

    await expect(getPublicJobs()).resolves.toEqual([publicJob]);
    expect(apiGet).toHaveBeenCalledOnce();
    expect(apiGet).toHaveBeenCalledWith("/jobs/public");
  });

  it("loads and unwraps a public job detail by id", async () => {
    apiGet.mockResolvedValue({ data: { data: publicJob } });

    await expect(getPublicJob("job-1")).resolves.toEqual(publicJob);
    expect(apiGet).toHaveBeenCalledOnce();
    expect(apiGet).toHaveBeenCalledWith("/jobs/public/job-1");
  });
});

describe("recruiter jobs API", () => {
  it("loads and unwraps the authenticated recruiter's company-scoped jobs", async () => {
    apiGet.mockResolvedValue({ data: { data: [recruiterJob] } });

    await expect(getRecruiterJobs()).resolves.toEqual([recruiterJob]);
    expect(apiGet).toHaveBeenCalledOnce();
    expect(apiGet).toHaveBeenCalledWith("/jobs");
  });

  it("loads a company-owned job detail", async () => {
    apiGet.mockResolvedValue({ data: { data: recruiterJob } });

    await expect(getRecruiterJob(recruiterJob.id)).resolves.toEqual(
      recruiterJob,
    );
    expect(apiGet).toHaveBeenCalledWith(`/jobs/${recruiterJob.id}`);
  });

  it("creates a structured job", async () => {
    const input = {
      title: "Full-Stack Engineer",
      description: "Build thoughtful hiring software.",
      employmentType: "FULL_TIME" as const,
      experienceMin: 3,
      experienceMax: 6,
      location: "Remote",
      isRemote: true,
      salaryMin: 90_000,
      salaryMax: 120_000,
      salaryCurrency: "USD",
      skills: ["React"],
      status: "OPEN" as const,
    };
    apiPost.mockResolvedValue({ data: { data: recruiterJob } });

    await expect(createRecruiterJob(input)).resolves.toEqual(recruiterJob);
    expect(apiPost).toHaveBeenCalledWith("/jobs", input);
  });

  it("updates a structured job and preserves CLOSED status", async () => {
    const input = {
      title: "Full-Stack Engineer",
      description: "Build thoughtful hiring software.",
      employmentType: "FULL_TIME" as const,
      experienceMin: 3,
      experienceMax: 6,
      location: "Remote",
      isRemote: true,
      salaryMin: 90_000,
      salaryMax: 120_000,
      salaryCurrency: "USD",
      skills: ["React"],
      status: "CLOSED" as const,
    };
    const closedJob = { ...recruiterJob, status: "CLOSED" as const };
    apiPut.mockResolvedValue({ data: { data: closedJob } });

    await expect(
      updateRecruiterJob({ id: recruiterJob.id, input }),
    ).resolves.toEqual(closedJob);
    expect(apiPut).toHaveBeenCalledWith(`/jobs/${recruiterJob.id}`, input);
  });
});
