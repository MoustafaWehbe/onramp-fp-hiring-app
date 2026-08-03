import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationTimeline } from "@/features/candidate/components/ApplicationTimeline";
import type { ApplicationTimeline as TimelineRecord } from "@/types/candidate";

const { useApplicationTimeline } = vi.hoisted(() => ({
  useApplicationTimeline: vi.fn(),
}));

vi.mock("@/features/candidate/hooks", () => ({ useApplicationTimeline }));

function timeline(
  overrides: Partial<TimelineRecord> = {},
): TimelineRecord {
  return {
    applicationId: "application-1",
    jobTitle: "Senior Product Engineer",
    companyName: "Northwind Labs",
    currentStage: "INTERVIEWING",
    submittedAt: "2026-07-20T09:00:00.000Z",
    interviewDate: null,
    entries: [
      {
        id: "entry-1",
        fromStage: null,
        toStage: "APPLIED",
        changedAt: "2026-07-20T09:00:00.000Z",
      },
      {
        id: "entry-2",
        fromStage: "APPLIED",
        toStage: "REVIEWED",
        changedAt: "2026-07-22T11:30:00.000Z",
      },
      {
        id: "entry-3",
        fromStage: "REVIEWED",
        toStage: "INTERVIEWING",
        changedAt: "2026-07-24T15:00:00.000Z",
      },
    ],
    hasCompleteHistory: true,
    ...overrides,
  };
}

function mockTimeline(data: TimelineRecord | undefined, extra = {}) {
  useApplicationTimeline.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    ...extra,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ApplicationTimeline", () => {
  it("renders each recorded stage with its timestamp", () => {
    mockTimeline(timeline());

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("Interviewing")).toBeInTheDocument();
    expect(screen.getByText(/Jul 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 24, 2026/)).toBeInTheDocument();
  });

  it("never renders recruiter-only fields", () => {
    // The endpoint does not return these, but this pins that the component
    // cannot start showing them if the payload ever changed.
    mockTimeline(
      timeline({
        // @ts-expect-error deliberately shaped like a leaking response
        fitScore: 93,
        aiSummary: "Strong systems background.",
        recruiterNotes: "Push for a fast offer.",
      }),
    );

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(screen.queryByText(/93/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Strong systems background/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Push for a fast offer/)).not.toBeInTheDocument();
  });

  it("explains that history starts here for an older application", () => {
    mockTimeline(
      timeline({
        hasCompleteHistory: false,
        currentStage: "OFFER",
        entries: [
          {
            id: "entry-1",
            fromStage: null,
            toStage: "APPLIED",
            changedAt: "2026-07-20T09:00:00.000Z",
          },
        ],
      }),
    );

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(
      screen.getByText(/tracked from this point forward/),
    ).toBeInTheDocument();
    // The current stage is still surfaced, so it does not look stalled.
    expect(screen.getByText("offer")).toBeInTheDocument();
  });

  it("labels a rejection in candidate-facing language", () => {
    mockTimeline(
      timeline({
        currentStage: "REJECTED",
        entries: [
          {
            id: "entry-1",
            fromStage: null,
            toStage: "APPLIED",
            changedAt: "2026-07-20T09:00:00.000Z",
          },
          {
            id: "entry-2",
            fromStage: "APPLIED",
            toStage: "REJECTED",
            changedAt: "2026-07-26T09:00:00.000Z",
          },
        ],
      }),
    );

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(screen.getByText("Not moving forward")).toBeInTheDocument();
  });

  it("shows an empty state rather than nothing when no history exists", () => {
    mockTimeline(timeline({ entries: [], currentStage: "APPLIED" }));

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(screen.getByText(/No progress recorded yet/)).toBeInTheDocument();
  });

  it("reports a load failure instead of rendering blank", () => {
    mockTimeline(undefined, {
      isError: true,
      error: {
        isAxiosError: true,
        response: { status: 500, data: { error: "Timeline unavailable." } },
      },
    });

    render(<ApplicationTimeline applicationId="application-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Timeline unavailable.",
    );
  });
});
