import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterDashboardPage } from "@/pages/recruiter/RecruiterDashboardPage";
import type { RecruiterAnalyticsRecord } from "@/types/analytics";
import type { RecruiterDashboardRecord } from "@/types/recruiter";

const { useRecruiterAnalytics, useRecruiterDashboard } = vi.hoisted(() => ({
  useRecruiterAnalytics: vi.fn(),
  useRecruiterDashboard: vi.fn(),
}));

vi.mock("@/features/recruiter/hooks", () => ({
  useRecruiterAnalytics: () => useRecruiterAnalytics(),
  useRecruiterDashboard: () => useRecruiterDashboard(),
}));

// Recharts measures its container, which jsdom reports as 0×0; a fixed size
// lets the SVG render so the charts' own content can be asserted on.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <actual.ResponsiveContainer width={640} height={240}>
        {children as never}
      </actual.ResponsiveContainer>
    ),
  };
});

const analytics: RecruiterAnalyticsRecord = {
  totalApplications: 4,
  funnel: {
    stages: [
      {
        stage: "APPLIED",
        count: 1,
        reached: 4,
        reachedPercentage: 100,
        conversionFromPrevious: null,
      },
      {
        stage: "REVIEWED",
        count: 1,
        reached: 3,
        reachedPercentage: 75,
        conversionFromPrevious: 75,
      },
      {
        stage: "INTERVIEWING",
        count: 1,
        reached: 2,
        reachedPercentage: 50,
        conversionFromPrevious: 66.7,
      },
      {
        stage: "OFFER",
        count: 1,
        reached: 1,
        reachedPercentage: 25,
        conversionFromPrevious: 50,
      },
      {
        stage: "HIRED",
        count: 0,
        reached: 0,
        reachedPercentage: 0,
        conversionFromPrevious: 0,
      },
    ],
    rejected: 0,
    rejectedPercentage: 0,
  },
  timeToHire: {
    hiredCount: 2,
    averageDays: 21.5,
    medianDays: 20,
    fastestDays: 14,
    slowestDays: 29,
    trend: [
      { month: "2026-06", hires: 1, averageDays: 29 },
      { month: "2026-07", hires: 1, averageDays: 14 },
    ],
  },
  scoreDistribution: {
    buckets: [
      { label: "0–20", min: 0, max: 20, count: 0 },
      { label: "21–40", min: 21, max: 40, count: 1 },
      { label: "41–60", min: 41, max: 60, count: 0 },
      { label: "61–80", min: 61, max: 80, count: 2 },
      { label: "81–100", min: 81, max: 100, count: 1 },
    ],
    scoredCount: 4,
    unscoredCount: 0,
    averageScore: 67.5,
    medianScore: 70,
  },
};

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

function analyticsState(overrides: Record<string, unknown> = {}) {
  return {
    data: analytics,
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RecruiterDashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterDashboard.mockReturnValue(state());
  useRecruiterAnalytics.mockReturnValue(analyticsState());
});

describe("RecruiterDashboardPage", () => {
  it("shows live company metrics and recent applicant destinations", () => {
    renderPage();

    expect(screen.getByText("Open jobs").previousElementSibling).toHaveTextContent(
      "2",
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

  it("reports real time-to-hire figures rather than a placeholder", () => {
    renderPage();

    const region = screen.getByRole("region", { name: "Time to hire" });

    expect(
      within(region).getByText("Average").nextElementSibling,
    ).toHaveTextContent("21.5 days");
    expect(
      within(region).getByText("Median").nextElementSibling,
    ).toHaveTextContent("20 days");
    expect(
      within(region).getByText("Fastest").nextElementSibling,
    ).toHaveTextContent("14 days");
    expect(
      within(region).getByText("Hires measured").nextElementSibling,
    ).toHaveTextContent("2");
  });

  it("renders funnel conversion with a readable table alongside the chart", () => {
    renderPage();

    const table = screen.getByRole("table", {
      name: "Funnel conversion by stage",
    });
    const reviewed = within(table).getByRole("rowheader", {
      name: "Reviewed",
    }).parentElement as HTMLElement;

    expect(within(reviewed).getByText("75%")).toBeInTheDocument();
    expect(within(reviewed).getByText("3")).toBeInTheDocument();
  });

  it("renders the score histogram with its real spread", () => {
    renderPage();

    const region = screen.getByRole("region", {
      name: "Fit score distribution",
    });

    expect(within(region).getAllByText("81–100").length).toBeGreaterThan(0);
    expect(within(region).getByText(/Average/)).toHaveTextContent(
      "Average 67.5",
    );
    expect(within(region).getByText(/Median/)).toHaveTextContent("Median 70");
    expect(within(region).getByText(/Scored/)).toHaveTextContent("Scored 4");
  });

  it("explains a missing time-to-hire instead of showing zero", () => {
    useRecruiterAnalytics.mockReturnValue(
      analyticsState({
        data: {
          ...analytics,
          timeToHire: {
            hiredCount: 0,
            averageDays: null,
            medianDays: null,
            fastestDays: null,
            slowestDays: null,
            trend: [],
          },
        },
      }),
    );

    renderPage();

    expect(
      screen.getByText("Not enough completed hires yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0 days")).not.toBeInTheDocument();
  });

  it("shows empty states for a company with no applications", () => {
    useRecruiterAnalytics.mockReturnValue(
      analyticsState({
        data: {
          totalApplications: 0,
          funnel: {
            stages: analytics.funnel.stages.map((stage) => ({
              ...stage,
              count: 0,
              reached: 0,
              reachedPercentage: 0,
              conversionFromPrevious:
                stage.stage === "APPLIED" ? null : 0,
            })),
            rejected: 0,
            rejectedPercentage: 0,
          },
          timeToHire: {
            hiredCount: 0,
            averageDays: null,
            medianDays: null,
            fastestDays: null,
            slowestDays: null,
            trend: [],
          },
          scoreDistribution: {
            buckets: analytics.scoreDistribution.buckets.map((bucket) => ({
              ...bucket,
              count: 0,
            })),
            scoredCount: 0,
            unscoredCount: 0,
            averageScore: null,
            medianScore: null,
          },
        },
      }),
    );

    renderPage();

    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    expect(
      screen.getByText("No scored applications yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Not enough completed hires yet"),
    ).toBeInTheDocument();
  });

  it("keeps the rest of the dashboard usable when analytics fail", async () => {
    const refetch = vi.fn();
    useRecruiterAnalytics.mockReturnValue(
      analyticsState({
        data: undefined,
        error: {
          isAxiosError: true,
          response: { data: { error: "Analytics service unavailable." } },
        },
        isError: true,
        refetch,
      }),
    );
    const user = userEvent.setup();

    renderPage();

    // Dashboard metrics still render; only the analytics cards degrade.
    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    const alerts = screen.getAllByRole("alert");
    expect(alerts[0]).toHaveTextContent("Analytics service unavailable.");

    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]);
    expect(refetch).toHaveBeenCalled();
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

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dashboard service unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
