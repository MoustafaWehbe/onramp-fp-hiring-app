import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterCandidateDetailsPage } from "@/pages/recruiter/RecruiterCandidateDetailsPage";
import type { RecruiterCandidateRecord } from "@/types/recruiter";

const { useRecruiterCandidate, useUpdateApplicationInterview } = vi.hoisted(
  () => ({
    useRecruiterCandidate: vi.fn(),
    useUpdateApplicationInterview: vi.fn(),
  }),
);

vi.mock("@/features/recruiter/hooks", () => ({
  recruiterKeys: {
    candidate: (id: string | undefined) => ["recruiter", "candidates", id],
  },
  useRecruiterCandidate: (id: string | undefined) =>
    useRecruiterCandidate(id),
}));

vi.mock("@/features/applications/hooks", () => ({
  useUpdateApplicationInterview: () => useUpdateApplicationInterview(),
}));

// The page now renders a scorecard panel per application. This file mounts
// the page without a QueryClientProvider, so the panel's queries are stubbed
// the same way every other feature hook here is. Scorecard behaviour itself is
// covered in the scorecards tests, not this one.
vi.mock("@/features/scorecards/hooks", () => ({
  scorecardKeys: {
    templates: ["scorecards", "templates"],
    application: (id: string | undefined) => ["scorecards", "application", id],
  },
  useScorecardTemplates: () => ({
    data: { templates: [], starterCriteria: [] },
    isLoading: false,
    isError: false,
  }),
  useApplicationScorecards: () => ({
    data: {
      scorecardCount: 0,
      overallAverage: null,
      criteriaAverages: [],
      scorecards: [],
    },
    isLoading: false,
    isError: false,
  }),
  useSubmitScorecard: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const candidate: RecruiterCandidateRecord = {
  id: "candidate-profile-amara",
  userId: "candidate-amara",
  headline: "Platform engineer",
  bio: "Builds reliable systems.",
  phone: null,
  location: "Lagos, Nigeria",
  resumeUrl: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  user: {
    id: "candidate-amara",
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
  },
  applicationResumes: [
    {
      applicationId: "application-1",
      jobId: "job-1",
      jobTitle: "Senior Platform Engineer",
      resumeOriginalFilename: "amara-platform.pdf",
      resumeUploadedAt: "2026-07-27T10:00:00.000Z",
      parsedYearsExperience: 7,
      parsedSkills: ["TypeScript", "Docker"],
      resumeDownloadUrl: "/api/applications/application-1/resume",
    },
  ],
  applicationInsights: [
    {
      applicationId: "application-1",
      jobId: "job-1",
      jobTitle: "Senior Platform Engineer",
      stage: "APPLIED",
      resumeOriginalFilename: "amara-platform.pdf",
      resumeUploadedAt: "2026-07-27T10:00:00.000Z",
      parsedYearsExperience: 7,
      parsedSkills: ["TypeScript", "Docker"],
      resumeDownloadUrl: "/api/applications/application-1/resume",
      fitScore: 91,
      aiSummary:
        "Amara's platform background strongly aligns with the role's reliability requirements.",
      aiStrengths: [
        "Strong TypeScript delivery",
        "Production Docker experience",
      ],
      aiGaps: ["Limited evidence of Kubernetes ownership"],
      aiScoredAt: "2026-07-27T10:02:00.000Z",
      aiScoringStatus: "completed",
      interviewDate: null,
      recruiterNotes: null,
      interviewScheduledAt: null,
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/recruiter/candidates/candidate-profile-amara"]}
    >
      <Routes>
        <Route
          path="/recruiter/candidates/:id"
          element={<RecruiterCandidateDetailsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterCandidate.mockReturnValue({
    data: candidate,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  });
  useUpdateApplicationInterview.mockReturnValue({
    isPending: false,
    mutate: vi.fn(),
  });
});

describe("RecruiterCandidateDetailsPage", () => {
  it("renders company-scoped application CV download links", () => {
    renderPage();

    expect(useRecruiterCandidate).toHaveBeenCalledWith(
      "candidate-profile-amara",
    );
    // Once per per-application section: interviews and notes, interview
    // scorecards, AI fit insights, and the CV list.
    expect(
      screen.getAllByText("Senior Platform Engineer"),
    ).toHaveLength(4);
    expect(screen.getByText(/amara-platform.pdf/)).toBeInTheDocument();
    expect(
      screen.getByText("Parsed skills: TypeScript, Docker"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View or download CV" }),
    ).toHaveAttribute(
      "href",
      "/api/applications/application-1/resume",
    );
    expect(screen.getByText("91% fit")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Amara's platform background strongly aligns with the role's reliability requirements.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Strong TypeScript delivery")).toBeInTheDocument();
    expect(
      screen.getByText("Limited evidence of Kubernetes ownership"),
    ).toBeInTheDocument();
  });

  it("saves recruiter notes on a candidate still in an early stage", async () => {
    const mutate = vi.fn();
    useUpdateApplicationInterview.mockReturnValue({
      isPending: false,
      mutate,
    });
    const user = userEvent.setup();

    renderPage();
    await user.type(
      screen.getByLabelText("Recruiter notes"),
      "Wants a systems-heavy team.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save interview details" }),
    );

    expect(mutate).toHaveBeenCalledWith(
      {
        applicationId: "application-1",
        jobId: "job-1",
        candidateProfileId: "candidate-profile-amara",
        recruiterNotes: "Wants a systems-heavy team.",
      },
      expect.anything(),
    );
  });

  it("clears a scheduled interview date as null rather than empty text", async () => {
    const mutate = vi.fn();
    useRecruiterCandidate.mockReturnValue({
      data: {
        ...candidate,
        applicationInsights: [
          {
            ...candidate.applicationInsights![0],
            interviewDate: "2026-08-05T13:30:00.000Z",
            interviewScheduledAt: "2026-07-29T09:00:00.000Z",
          },
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useUpdateApplicationInterview.mockReturnValue({
      isPending: false,
      mutate,
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    await user.click(
      screen.getByRole("button", { name: "Save interview details" }),
    );

    expect(mutate).toHaveBeenCalledWith(
      {
        applicationId: "application-1",
        jobId: "job-1",
        candidateProfileId: "candidate-profile-amara",
        interviewDate: null,
      },
      expect.anything(),
    );
  });

  it("keeps the save action inert until something actually changed", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "Save interview details" }),
    ).toBeDisabled();
  });
});
