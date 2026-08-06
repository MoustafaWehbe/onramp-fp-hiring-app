import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ScorecardAggregateView } from "@/features/scorecards/components/ScorecardAggregateView";
import type { ScorecardAggregate } from "@/types/scorecards";

const twoSubmissions: ScorecardAggregate = {
  scorecardCount: 2,
  overallAverage: 3,
  criteriaAverages: [
    {
      criterionId: "c1",
      criterionLabel: "Technical",
      averageRating: 3,
      ratingCount: 2,
    },
    {
      criterionId: "c2",
      criterionLabel: "Communication",
      averageRating: 4,
      ratingCount: 2,
    },
  ],
  scorecards: [
    {
      id: "s1",
      interviewerId: "u1",
      interviewerName: "Rae Cruter",
      isMine: true,
      templateId: "t1",
      templateTitle: "Engineering loop",
      overallComment: "Would hire.",
      submittedAt: "2026-08-01T10:00:00.000Z",
      averageRating: 4,
      ratings: [
        {
          criterionId: "c1",
          criterionLabel: "Technical",
          rating: 4,
          comment: "Strong fundamentals",
        },
        {
          criterionId: "c2",
          criterionLabel: "Communication",
          rating: 4,
          comment: null,
        },
      ],
    },
    {
      id: "s2",
      interviewerId: "u2",
      interviewerName: "Nadia Hiring",
      isMine: false,
      templateId: "t1",
      templateTitle: "Engineering loop",
      overallComment: null,
      submittedAt: "2026-08-02T10:00:00.000Z",
      averageRating: 2,
      ratings: [
        {
          criterionId: "c1",
          criterionLabel: "Technical",
          rating: 2,
          comment: null,
        },
        {
          criterionId: "c2",
          criterionLabel: "Communication",
          rating: 4,
          comment: null,
        },
      ],
    },
  ],
};

describe("ScorecardAggregateView", () => {
  it("says plainly that nobody has scored yet, without showing a zero", () => {
    render(
      <ScorecardAggregateView
        aggregate={{
          scorecardCount: 0,
          overallAverage: null,
          criteriaAverages: [],
          scorecards: [],
        }}
      />,
    );

    expect(
      screen.getByText(/no scorecards submitted yet/i),
    ).toBeInTheDocument();
    // A 0.0 here would read as "everyone rated them the worst possible".
    expect(screen.queryByText("0.0/5")).not.toBeInTheDocument();
  });

  it("leads with the overall average and how many scorecards built it", () => {
    render(<ScorecardAggregateView aggregate={twoSubmissions} />);

    expect(screen.getByText("3.0/5")).toBeInTheDocument();
    expect(screen.getByText(/from 2 scorecards/i)).toBeInTheDocument();
  });

  it("breaks the average down per criterion", () => {
    render(<ScorecardAggregateView aggregate={twoSubmissions} />);

    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("3.0")).toBeInTheDocument();
    expect(screen.getByText("4.0")).toBeInTheDocument();
  });

  it("lists every interviewer so an average is never anonymous", () => {
    render(<ScorecardAggregateView aggregate={twoSubmissions} />);

    expect(screen.getByText("Rae Cruter")).toBeInTheDocument();
    expect(screen.getByText("Nadia Hiring")).toBeInTheDocument();
  });

  it("keeps individual ratings one click away rather than hidden", async () => {
    const user = userEvent.setup();
    render(<ScorecardAggregateView aggregate={twoSubmissions} />);

    // Collapsed: a disagreement behind the average is not on screen yet.
    expect(screen.queryByText("Strong fundamentals")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /rae cruter/i }));

    expect(screen.getByText("Strong fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Would hire.")).toBeInTheDocument();
  });

  it("uses singular wording for a single submission", () => {
    render(
      <ScorecardAggregateView
        aggregate={{
          ...twoSubmissions,
          scorecardCount: 1,
          overallAverage: 4,
          scorecards: [twoSubmissions.scorecards[0]],
        }}
      />,
    );

    expect(screen.getByText(/from 1 scorecard$/i)).toBeInTheDocument();
  });
});
