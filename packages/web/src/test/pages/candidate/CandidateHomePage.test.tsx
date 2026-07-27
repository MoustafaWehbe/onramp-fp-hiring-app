import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateHomePage } from "@/pages/candidate/CandidateHomePage";
import type { CandidateApplication } from "@/types/applications";
import type { PublicJobRecord } from "@/types/jobs";

const {
  useExperience,
  useMyApplications,
  useProfile,
  usePublicJobs,
  useSkills,
} = vi.hoisted(() => ({
  useExperience: vi.fn(),
  useMyApplications: vi.fn(),
  useProfile: vi.fn(),
  usePublicJobs: vi.fn(),
  useSkills: vi.fn(),
}));

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: () => useMyApplications(),
}));
vi.mock("@/features/candidate/hooks", () => ({
  useExperience: (enabled: boolean) => useExperience(enabled),
  useProfile: () => useProfile(),
  useSkills: (enabled: boolean) => useSkills(enabled),
}));
vi.mock("@/features/jobs/hooks", () => ({
  usePublicJobs: () => usePublicJobs(),
}));

const job: PublicJobRecord = {
  id: "job-1",
  title: "Platform Engineer",
  description: "Build dependable infrastructure.",
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
    name: "Northwind Labs",
    website: null,
    logoUrl: null,
  },
  skills: [{ id: "skill-1", name: "TypeScript" }],
};

const application: CandidateApplication = {
  id: "application-1",
  jobId: job.id,
  stage: "APPLIED",
  coverLetter: null,
  resumeUrl: null,
  submittedAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
  job: {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    status: job.status,
    createdAt: job.createdAt,
    company: job.company,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  usePublicJobs.mockReturnValue({
    data: [job],
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  useMyApplications.mockReturnValue({
    data: [application],
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  useProfile.mockReturnValue({
    data: {
      id: "profile-1",
      userId: "candidate-1",
      headline: "Product engineer",
      bio: "Builds thoughtful products.",
      phone: null,
      location: "Lagos",
      resumeUrl: "https://example.com/resume.pdf",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
  useExperience.mockReturnValue({
    data: [{ id: "experience-1" }],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  useSkills.mockReturnValue({
    data: [{ id: "skill-1" }],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
});

describe("CandidateHomePage", () => {
  it("derives its jobs, applications, and profile readiness from live queries", () => {
    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Platform Engineer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northwind Labs").length).toBeGreaterThan(0);
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(useExperience).toHaveBeenCalledWith(true);
    expect(useSkills).toHaveBeenCalledWith(true);
  });

  it("shows API failures instead of false empty counts and states", () => {
    usePublicJobs.mockReturnValue({
      data: undefined,
      error: new Error("jobs unavailable"),
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    useMyApplications.mockReturnValue({
      data: undefined,
      error: new Error("applications unavailable"),
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    useProfile.mockReturnValue({
      data: undefined,
      error: new Error("profile unavailable"),
      isError: true,
      isLoading: false,
      isSuccess: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Couldn't load open jobs.")).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't load your applications."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't load your profile readiness."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No open jobs are available right now."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("You have not applied to a role yet."),
    ).not.toBeInTheDocument();
  });
});
