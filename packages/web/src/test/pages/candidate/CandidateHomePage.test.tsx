import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CandidateHomePage } from "@/pages/candidate/CandidateHomePage";
import type { JobRecommendation } from "@/types/candidate";
import type { CandidateApplication } from "@/types/applications";
import type { PublicJobRecord } from "@/types/jobs";

const {
  useExperience,
  useMyApplications,
  useProfile,
  useRecommendations,
  usePublicJobs,
  useSkills,
} = vi.hoisted(() => ({
  useExperience: vi.fn(),
  useMyApplications: vi.fn(),
  useProfile: vi.fn(),
  useRecommendations: vi.fn(),
  usePublicJobs: vi.fn(),
  useSkills: vi.fn(),
}));

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: () => useMyApplications(),
}));
vi.mock("@/features/candidate/hooks", () => ({
  useExperience: (enabled: boolean) => useExperience(enabled),
  useProfile: () => useProfile(),
  useRecommendations: (limit?: number) => useRecommendations(limit),
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

function recommendation(
  overrides: Partial<JobRecommendation> = {},
): JobRecommendation {
  return {
    jobId: "rec-job-1",
    score: 88,
    reason: "Matches 2 of 3 listed skills.",
    matchedSkills: ["React", "Node.js"],
    computedAt: "2026-08-01T10:00:00.000Z",
    job: {
      id: "rec-job-1",
      title: "Staff Frontend Engineer",
      location: "Remote",
      isRemote: true,
      employmentType: "FULL_TIME",
      experienceMin: 5,
      experienceMax: 10,
      salaryMin: 120_000,
      salaryMax: 160_000,
      salaryCurrency: "USD",
      skills: ["React", "Node.js", "GraphQL"],
      createdAt: "2026-07-15T10:00:00.000Z",
      company: { id: "company-2", name: "Acme Co", logoUrl: null },
    },
    ...overrides,
  };
}

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
  useRecommendations.mockReturnValue({
    data: { status: "ready", recommendations: [recommendation()] },
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

  it("filters the open jobs section by the homepage search box", async () => {
    const secondJob: PublicJobRecord = {
      ...job,
      id: "job-2",
      title: "Support Engineer",
      company: { ...job.company, id: "company-2", name: "Acme Co" },
    };
    usePublicJobs.mockReturnValue({
      data: [job, secondJob],
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    // "Platform Engineer" also appears in the Application status sidebar
    // card, since the `application` fixture references the same job.
    expect(screen.getAllByText("Platform Engineer").length).toBeGreaterThan(0);
    expect(screen.getByText("Support Engineer")).toBeInTheDocument();

    await user.type(
      screen.getByRole("searchbox", { name: /search open jobs/i }),
      "Platform",
    );

    expect(screen.getAllByText("Platform Engineer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Support Engineer")).not.toBeInTheDocument();
  });

  it("shows recommended jobs with their matched-skills badge", () => {
    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(useRecommendations).toHaveBeenCalledWith(4);
    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
    expect(screen.getByText("Staff Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByText("Matches: React, Node.js")).toBeInTheDocument();
  });

  it("prompts profile completion when the profile is too sparse to score", () => {
    useRecommendations.mockReturnValue({
      data: { status: "insufficient-profile", recommendations: [] },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Add a little more to your profile"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Complete your profile" }),
    ).toHaveAttribute("href", "/profile");
    expect(screen.queryByText("Staff Frontend Engineer")).not.toBeInTheDocument();
  });

  it("hides the recommended section entirely when recommendations fail to load", () => {
    useRecommendations.mockReturnValue({
      data: undefined,
      error: new Error("recommendations unavailable"),
      isError: true,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Recommended for you")).not.toBeInTheDocument();
  });

  it("shows a friendly empty state, not a spinner, once ready with zero matches", () => {
    useRecommendations.mockReturnValue({
      data: { status: "ready", recommendations: [] },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Finding your matches")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "No new matches right now — check back soon, or browse all open jobs.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("gives up on a stuck computing state after the polling timeout and shows the empty state", () => {
    useRecommendations.mockReturnValue({
      data: { status: "computing", recommendations: [] },
      isError: false,
      isLoading: false,
      timedOut: true,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CandidateHomePage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Finding your matches")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });
});
