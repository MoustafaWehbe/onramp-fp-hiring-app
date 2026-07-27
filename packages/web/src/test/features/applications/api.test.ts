import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyToJob,
  getApplicationsByJob,
  getMyApplications,
  updateApplicationStage,
} from "@/features/applications/api";
import type {
  CandidateApplication,
  RecruiterPipelineApplication,
  SubmittedApplication,
} from "@/types/applications";

const { apiGet, apiPatch, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    patch: apiPatch,
    post: apiPost,
  },
}));

const candidateApplication: CandidateApplication = {
  id: "application-1",
  jobId: "job-1",
  stage: "APPLIED",
  coverLetter: null,
  resumeUrl: null,
  submittedAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
  job: {
    id: "job-1",
    title: "Product Engineer",
    description: "Build a thoughtful hiring product.",
    location: "Remote",
    status: "OPEN",
    createdAt: "2026-07-20T10:00:00.000Z",
    company: {
      id: "company-1",
      name: "Northstar Labs",
      website: null,
      logoUrl: null,
    },
  },
};

const submittedApplication: SubmittedApplication = {
  id: "application-1",
  jobId: "job-1",
  candidateProfileId: "candidate-profile-1",
  stage: "APPLIED",
  coverLetter: null,
  resumeUrl: null,
  submittedAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
};

const recruiterApplication: RecruiterPipelineApplication = {
  ...submittedApplication,
  stage: "APPLIED",
  candidateProfile: {
    id: "candidate-profile-1",
    userId: "candidate-1",
    headline: "Product-minded engineer",
    bio: "I build accessible product experiences.",
    phone: null,
    location: "Lagos, Nigeria",
    resumeUrl: "https://example.com/resume.pdf",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    user: {
      id: "candidate-1",
      name: "Amara Okafor",
      email: "amara.okafor@example.com",
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("candidate applications API", () => {
  it("loads and unwraps the current candidate's applications", async () => {
    apiGet.mockResolvedValue({
      data: { data: [candidateApplication] },
    });

    await expect(getMyApplications()).resolves.toEqual([
      candidateApplication,
    ]);
    expect(apiGet).toHaveBeenCalledOnce();
    expect(apiGet).toHaveBeenCalledWith("/applications/me");
  });

  it("submits an application and unwraps the response", async () => {
    apiPost.mockResolvedValue({
      data: { data: submittedApplication },
    });

    await expect(applyToJob({ jobId: "job-1" })).resolves.toEqual(
      submittedApplication,
    );
    expect(apiPost).toHaveBeenCalledOnce();
    expect(apiPost).toHaveBeenCalledWith("/applications", {
      jobId: "job-1",
    });
  });

  it("loads and unwraps a recruiter's applications for one job", async () => {
    apiGet.mockResolvedValue({
      data: { data: [recruiterApplication] },
    });

    await expect(getApplicationsByJob("job-1")).resolves.toEqual([
      recruiterApplication,
    ]);
    expect(apiGet).toHaveBeenCalledOnce();
    expect(apiGet).toHaveBeenCalledWith("/applications/job/job-1");
  });

  it("updates an application stage and unwraps the response", async () => {
    const interviewingApplication: SubmittedApplication = {
      ...submittedApplication,
      stage: "INTERVIEWING",
    };
    apiPatch.mockResolvedValue({
      data: { data: interviewingApplication },
    });

    await expect(
      updateApplicationStage({
        applicationId: "application-1",
        jobId: "job-1",
        stage: "INTERVIEWING",
      }),
    ).resolves.toEqual(interviewingApplication);
    expect(apiPatch).toHaveBeenCalledOnce();
    expect(apiPatch).toHaveBeenCalledWith(
      "/applications/application-1/stage",
      { stage: "INTERVIEWING" },
    );
  });
});
