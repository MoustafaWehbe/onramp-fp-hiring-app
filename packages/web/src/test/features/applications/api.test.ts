import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyToJob,
  getApplicationsByJob,
  getMyApplications,
  replaceApplicationResume,
  rescoreApplication,
  updateApplicationInterview,
  updateApplicationStage,
} from "@/features/applications/api";
import type {
  CandidateApplication,
  RecruiterApplicationRecord,
  RecruiterPipelineApplication,
  SubmittedApplication,
} from "@/types/applications";

const { apiGet, apiPatch, apiPost, apiPut } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: apiGet,
    patch: apiPatch,
    post: apiPost,
    put: apiPut,
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
  fitScore: 87,
  aiSummary:
    "The candidate's product engineering background aligns well with the role.",
  aiStrengths: ["Strong TypeScript experience", "Product delivery ownership"],
  aiGaps: ["No direct hiring-platform experience"],
  aiScoredAt: "2026-07-27T10:01:00.000Z",
  aiScoringStatus: "completed",
  interviewDate: null,
  recruiterNotes: null,
  interviewScheduledAt: null,
  googleMeetLink: null,
  calendarSyncStatus: "not_synced",
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
    expect(apiPost).toHaveBeenCalledWith(
      "/applications",
      { jobId: "job-1" },
      undefined,
    );
  });

  it("uploads a CV as multipart data and reports progress", async () => {
    const file = new File(["resume"], "amara.pdf", {
      type: "application/pdf",
    });
    const onUploadProgress = vi.fn();
    apiPost.mockResolvedValue({
      data: { data: submittedApplication },
    });

    await applyToJob({ jobId: "job-1", resumeFile: file, onUploadProgress });

    const [, body, config] = apiPost.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("jobId")).toBe("job-1");
    expect(body.get("resume")).toBe(file);
    expect(config.headers).toEqual({
      "Content-Type": "multipart/form-data",
    });
    config.onUploadProgress({ loaded: 1, total: 4 });
    expect(onUploadProgress).toHaveBeenCalledWith(25);
  });

  it("replaces an application CV through the authorized endpoint", async () => {
    const file = new File(["resume"], "amara.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const onUploadProgress = vi.fn();
    apiPut.mockResolvedValue({
      data: { data: submittedApplication },
    });

    await expect(
      replaceApplicationResume({
        applicationId: "application-1",
        file,
        onUploadProgress,
      }),
    ).resolves.toEqual(submittedApplication);

    const [url, body, config] = apiPut.mock.calls[0];
    expect(url).toBe("/applications/application-1/resume");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("resume")).toBe(file);
    config.onUploadProgress({ loaded: 5, total: 5 });
    expect(onUploadProgress).toHaveBeenCalledWith(100);
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
    const interviewingApplication: RecruiterApplicationRecord = {
      ...recruiterApplication,
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

  it("sends an interview date alongside a stage change when one was chosen", async () => {
    apiPatch.mockResolvedValue({
      data: { data: recruiterApplication },
    });

    await updateApplicationStage({
      applicationId: "application-1",
      jobId: "job-1",
      stage: "INTERVIEWING",
      interviewDate: "2026-08-05T13:30:00.000Z",
    });

    expect(apiPatch).toHaveBeenCalledWith(
      "/applications/application-1/stage",
      {
        stage: "INTERVIEWING",
        interviewDate: "2026-08-05T13:30:00.000Z",
      },
    );
  });

  it("sends only the interview fields the recruiter actually changed", async () => {
    apiPatch.mockResolvedValue({
      data: { data: recruiterApplication },
    });

    await updateApplicationInterview({
      applicationId: "application-1",
      jobId: "job-1",
      recruiterNotes: "Strong systems answers; schedule the panel.",
    });

    expect(apiPatch).toHaveBeenCalledWith(
      "/applications/application-1/interview",
      { recruiterNotes: "Strong systems answers; schedule the panel." },
    );
  });

  it("sends an explicit null to clear a previously set interview date", async () => {
    apiPatch.mockResolvedValue({
      data: { data: recruiterApplication },
    });

    await updateApplicationInterview({
      applicationId: "application-1",
      jobId: "job-1",
      interviewDate: null,
    });

    expect(apiPatch).toHaveBeenCalledWith(
      "/applications/application-1/interview",
      { interviewDate: null },
    );
  });

  it("queues a recruiter-authorized application rescore", async () => {
    const pendingApplication: RecruiterPipelineApplication = {
      ...recruiterApplication,
      fitScore: null,
      aiSummary: null,
      aiStrengths: [],
      aiGaps: [],
      aiScoredAt: null,
      aiScoringStatus: "pending",
    };
    apiPost.mockResolvedValue({
      data: { data: pendingApplication },
    });

    await expect(
      rescoreApplication({
        applicationId: "application-1",
        jobId: "job-1",
      }),
    ).resolves.toEqual(pendingApplication);
    expect(apiPost).toHaveBeenCalledWith(
      "/applications/application-1/rescore",
    );
  });
});
