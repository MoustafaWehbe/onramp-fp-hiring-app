import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendedJobs } from "@/features/candidate/components/RecommendedJobs";
import type { JobRecommendation } from "@/types/candidate";

const { useRecommendations } = vi.hoisted(() => ({
  useRecommendations: vi.fn(),
}));

vi.mock("@/features/candidate/hooks", () => ({ useRecommendations }));

function recommendation(
  overrides: Partial<JobRecommendation> = {},
): JobRecommendation {
  return {
    jobId: "job-1",
    score: 82,
    reason: "Matches 2 of 3 listed skills (React, TypeScript).",
    matchedSkills: ["React", "TypeScript"],
    computedAt: "2026-08-01T10:00:00.000Z",
    job: {
      id: "job-1",
      title: "Senior Product Engineer",
      location: "Remote",
      isRemote: true,
      employmentType: "FULL_TIME",
      experienceMin: 4,
      experienceMax: 8,
      salaryMin: 90_000,
      salaryMax: 140_000,
      salaryCurrency: "USD",
      skills: ["React", "TypeScript", "Go"],
      createdAt: "2026-07-20T10:00:00.000Z",
      company: { id: "company-1", name: "Northwind Labs", logoUrl: null },
    },
    ...overrides,
  };
}

function mockQuery(data: unknown, extra = {}) {
  useRecommendations.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecommendedJobs", () => {
  it("lists scored matches with their reason and matched skills", () => {
    mockQuery({
      status: "ready",
      recommendations: [
        recommendation(),
        recommendation({
          jobId: "job-2",
          score: 51,
          reason: "Matches 1 of 3 listed skills (React).",
          matchedSkills: ["React"],
          job: {
            ...recommendation().job!,
            id: "job-2",
            title: "Platform Engineer",
          },
        }),
      ],
    });

    render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    // The score renders as a ring, so the accessible name carries it rather
    // than a text node.
    expect(screen.getByRole("img", { name: "82% match" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "51% match" })).toBeInTheDocument();
    expect(
      screen.getByText("Matches 2 of 3 listed skills (React, TypeScript)."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Senior Product Engineer" }),
    ).toHaveAttribute("href", "/jobs/job-1");
  });

  it("shows a computing state on a first visit rather than an empty panel", () => {
    mockQuery({ status: "computing", recommendations: [] });

    render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    expect(screen.getByText("Finding your matches")).toBeInTheDocument();
  });

  it("asks a sparse profile for more instead of showing a meaningless score", () => {
    mockQuery({ status: "insufficient-profile", recommendations: [] });

    render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Add a little more to your profile"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Complete your profile" }),
    ).toHaveAttribute("href", "/candidate/profile");
    expect(screen.queryByRole("img", { name: /% match/ })).not.toBeInTheDocument();
  });

  it("explains an empty result when everything open has been applied to", () => {
    mockQuery({ status: "ready", recommendations: [] });

    render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    expect(screen.getByText("No new matches right now")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("gives up on a stuck computing state and shows the empty state instead of spinning forever", () => {
    mockQuery(
      { status: "computing", recommendations: [] },
      { timedOut: true },
    );

    render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Finding your matches")).not.toBeInTheDocument();
    expect(screen.getByText("No new matches right now")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("stays out of the way for a candidate with no profile", () => {
    // The endpoint 404s; the profile prompt belongs to the page, not here.
    mockQuery(undefined, { isError: true });

    const { container } = render(
      <MemoryRouter>
        <RecommendedJobs />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
