import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterDashboardPage } from "@/pages/recruiter/RecruiterDashboardPage";
import type { RecruiterDashboardRecord } from "@/types/recruiter";

const { useRecruiterDashboard } = vi.hoisted(() => ({
  useRecruiterDashboard: vi.fn(),
}));

vi.mock("@/features/recruiter/hooks", () => ({
  useRecruiterDashboard: () => useRecruiterDashboard(),
}));

const dashboard: RecruiterDashboardRecord = {
  metrics: {
    totalJobs: 3,
    openJobs: 2,
    totalApplications: 4,
    interviewing: 1,
    offers: 1,
    hires: 0,
  },
  stageCounts: {
    APPLIED: 1,
    REVIEWED: 1,
    INTERVIEWING: 1,
    OFFER: 1,
    HIRED: 0,
    REJECTED: 0,
  },
  recentApplicants: [
    {
      id: "application-1",
      jobId: "job-1",
      jobTitle: "Platform Engineer",
      stage: "APPLIED",
      submittedAt: "2026-07-27T10:00:00.000Z",
      candidateProfile: {
        id: "profile-1",
        headline: "Software engineer",
        location: "Lagos",
        resumeUrl: null,
        user: {
          id: "candidate-1",
          name: "Amara Okafor",
          email: "amara.okafor@example.com",
        },
      },
    },
  ],
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    data: dashboard,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterDashboard.mockReturnValue(state());
});

describe("RecruiterDashboardPage", () => {
  it("shows live company metrics and recent applicant destinations", () => {
    render(
      <MemoryRouter>
        <RecruiterDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("2").nextElementSibling).toHaveTextContent(
      "Open jobs",
    );
    expect(screen.getByText("Amara Okafor")).toHaveAttribute(
      "href",
      "/recruiter/candidates/profile-1",
    );
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View pipeline" })).toHaveAttribute(
      "href",
      "/recruiter/pipeline/job-1",
    );
  });

  it("reports a dashboard error and retries", async () => {
    const refetch = vi.fn();
    useRecruiterDashboard.mockReturnValue(
      state({
        data: undefined,
        error: {
          isAxiosError: true,
          response: { data: { error: "Dashboard service unavailable." } },
        },
        isError: true,
        refetch,
      }),
    );
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RecruiterDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dashboard service unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
