import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineBoard } from "@/features/applications/components/PipelineBoard";
import type { RecruiterPipelineApplication } from "@/types/applications";

const base: RecruiterPipelineApplication = {
  id: "application-amara",
  jobId: "job-1",
  candidateProfileId: "candidate-profile-amara",
  stage: "APPLIED",
  coverLetter: null,
  resumeUrl: null,
  resumeOriginalFilename: null,
  resumeDownloadUrl: null,
  resumeUploadedAt: null,
  resumeParseSucceeded: null,
  parsedYearsExperience: null,
  parsedSkills: [],
  fitScore: 87,
  aiSummary: null,
  aiStrengths: [],
  aiGaps: [],
  aiScoredAt: "2026-07-27T10:01:00.000Z",
  aiScoringStatus: "completed",
  interviewDate: null,
  recruiterNotes: null,
  interviewScheduledAt: null,
  googleMeetLink: null,
  calendarSyncStatus: "not_synced",
  submittedAt: "2026-07-27T10:00:00.000Z",
  createdAt: "2026-07-27T10:00:00.000Z",
  updatedAt: "2026-07-27T10:00:00.000Z",
  candidateProfile: {
    id: "candidate-profile-amara",
    userId: "candidate-amara",
    headline: "Product-minded software engineer",
    bio: null,
    phone: null,
    location: "Lagos, Nigeria",
    resumeUrl: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    user: {
      id: "candidate-amara",
      name: "Amara Okafor",
      email: "amara.okafor@example.com",
    },
  },
};

function application(
  overrides: Partial<RecruiterPipelineApplication> & { id: string },
): RecruiterPipelineApplication {
  return {
    ...base,
    ...overrides,
    candidateProfile: {
      ...base.candidateProfile,
      ...(overrides.candidateProfile ?? {}),
    },
  };
}

function renderBoard(applications: RecruiterPipelineApplication[]) {
  const onMove = vi.fn();
  const onRefuse = vi.fn();

  render(
    <MemoryRouter>
      <PipelineBoard
        applications={applications}
        onMove={onMove}
        onRefuse={onRefuse}
      />
    </MemoryRouter>,
  );

  return { onMove, onRefuse };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PipelineBoard", () => {
  it("renders a column per stage with its own count", () => {
    renderBoard([
      application({ id: "a", stage: "APPLIED" }),
      application({ id: "b", stage: "APPLIED" }),
      application({ id: "c", stage: "INTERVIEWING" }),
    ]);

    const applied = screen.getByRole("region", { name: "Applied column" });
    const interviewing = screen.getByRole("region", {
      name: "Interviewing column",
    });

    expect(within(applied).getByText("2")).toBeInTheDocument();
    expect(within(interviewing).getByText("1")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Hired column" })).getByText(
        "Nobody here yet",
      ),
    ).toBeInTheDocument();
  });

  it("places each candidate in the column matching their stage", () => {
    renderBoard([
      application({ id: "a", stage: "OFFER" }),
      application({
        id: "b",
        stage: "REJECTED",
        candidateProfile: {
          ...base.candidateProfile,
          id: "profile-b",
          user: {
            id: "candidate-b",
            name: "Jordan Lee",
            email: "jordan.lee@example.com",
          },
        },
      }),
    ]);

    expect(
      within(screen.getByRole("region", { name: "Offer column" })).getByText(
        "Amara Okafor",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Rejected column" })).getByText(
        "Jordan Lee",
      ),
    ).toBeInTheDocument();
  });

  it("carries the fit score, interview date, and notes indicators onto the card", () => {
    renderBoard([
      application({
        id: "a",
        interviewDate: "2026-08-05T13:30:00.000Z",
        recruiterNotes: "Strong systems answers.",
      }),
    ]);

    const column = screen.getByRole("region", { name: "Applied column" });

    expect(within(column).getByText("87% fit")).toBeInTheDocument();
    expect(within(column).getByText("Notes")).toBeInTheDocument();
    expect(within(column).getByText(/Aug 5, 2026/)).toBeInTheDocument();
  });

  it("shows a pending score without inventing a number", () => {
    renderBoard([
      application({ id: "a", fitScore: null, aiScoringStatus: "pending" }),
    ]);

    expect(screen.getByText("Scoring")).toBeInTheDocument();
    expect(screen.queryByText(/% fit/)).not.toBeInTheDocument();
  });

  it("gives every card a keyboard-reachable drag handle", () => {
    renderBoard([application({ id: "a" })]);

    expect(
      screen.getByRole("button", { name: "Move Amara Okafor" }),
    ).toBeInTheDocument();
  });

  it("links a card to the candidate's profile", () => {
    renderBoard([application({ id: "a" })]);

    expect(screen.getByRole("link", { name: "Amara Okafor" })).toHaveAttribute(
      "href",
      "/recruiter/candidates/candidate-profile-amara",
    );
  });

  it("orders a column by fit score, highest first", () => {
    renderBoard([
      application({
        id: "low",
        fitScore: 40,
        candidateProfile: {
          ...base.candidateProfile,
          id: "profile-low",
          user: { id: "u-low", name: "Lower Fit", email: "low@example.com" },
        },
      }),
      application({ id: "high", fitScore: 92 }),
    ]);

    const column = screen.getByRole("region", { name: "Applied column" });
    const names = within(column)
      .getAllByRole("link")
      .map((link) => link.textContent);

    expect(names).toEqual(["Amara Okafor", "Lower Fit"]);
  });
});
