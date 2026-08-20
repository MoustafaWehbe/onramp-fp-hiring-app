import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterPipelinePage } from "@/pages/recruiter/RecruiterPipelinePage";
import type {
  RecruiterMutableApplicationStage,
  RecruiterPipelineApplication,
} from "@/types/applications";
import type { RecruiterJobRecord } from "@/types/jobs";

const {
  boardProps,
  toastError,
  toastSuccess,
  useApplicationsByJob,
  useCompanyProfile,
  useRealtime,
  useRecruiterJobs,
  useRescoreApplication,
  useUpdateApplicationInterview,
  useUpdateApplicationStage,
} = vi.hoisted(() => ({
  boardProps: { current: null as Record<string, unknown> | null },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  useApplicationsByJob: vi.fn(),
  useCompanyProfile: vi.fn(),
  useRealtime: vi.fn(),
  useRecruiterJobs: vi.fn(),
  useRescoreApplication: vi.fn(),
  useUpdateApplicationInterview: vi.fn(),
  useUpdateApplicationStage: vi.fn(),
}));

/**
 * The board itself is exercised in PipelineBoard.test.tsx against the real
 * dnd-kit context. Stubbing it here lets these tests drive the page's move
 * wiring — mutation payload, toasts, the schedule prompt — without depending
 * on pointer geometry jsdom cannot provide.
 */
vi.mock("@/features/applications/components/PipelineBoard", () => ({
  PipelineBoard: (props: Record<string, unknown>) => {
    boardProps.current = props;
    const applications = props.applications as RecruiterPipelineApplication[];

    return (
      <div data-testid="pipeline-board">
        {applications.map((application) => (
          <span key={application.id}>
            {application.candidateProfile.user.name} in {application.stage}
          </span>
        ))}
      </div>
    );
  },
}));

vi.mock("@/features/applications/hooks", () => ({
  useApplicationsByJob: (jobId: string | undefined) =>
    useApplicationsByJob(jobId),
  useRescoreApplication: () => useRescoreApplication(),
  useUpdateApplicationInterview: () => useUpdateApplicationInterview(),
  useUpdateApplicationStage: () => useUpdateApplicationStage(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJobs: () => useRecruiterJobs(),
}));

/**
 * The page joins talent-pool membership onto the board's cards from the
 * recruiter candidate listing. These tests are about move wiring, not markers,
 * so it stands in as an empty result — which is also what a Free-tier company
 * gets, since the real hook is disabled for them.
 */
vi.mock("@/features/recruiter/hooks", () => ({
  useRecruiterCandidates: () => ({ data: undefined }),
}));

vi.mock("@/features/calendar/hooks", () => ({
  useCalendarConnection: () => ({
    data: {
      configured: true,
      connected: false,
      googleEmail: null,
      connectedAt: null,
    },
  }),
}));

vi.mock("@/providers/RealtimeProvider", () => ({
  useRealtime: () => useRealtime(),
}));

// The bulk rescore action and the fit/scorecard badges on each card are
// Pro-gated. These tests exercise the unlocked (Pro) behaviour that
// predates subscription tiers.
vi.mock("@/features/company/hooks", () => ({
  useCompanyProfile: () => useCompanyProfile(),
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess, warning: vi.fn() },
}));

const amaraApplication: RecruiterPipelineApplication = {
  id: "application-amara",
  jobId: "job-1",
  candidateProfileId: "candidate-profile-amara",
  stage: "APPLIED",
  coverLetter: "I would love to help build a thoughtful hiring product.",
  resumeUrl: null,
  resumeOriginalFilename: "amara-application-cv.pdf",
  resumeDownloadUrl: "/api/applications/application-amara/resume",
  resumeUploadedAt: "2026-07-27T10:00:00.000Z",
  resumeParseSucceeded: true,
  parsedYearsExperience: 6,
  parsedSkills: ["React", "TypeScript"],
  fitScore: 87,
  aiSummary: "Amara's frontend product experience strongly matches this role.",
  aiStrengths: ["React delivery"],
  aiGaps: ["Limited platform operations evidence"],
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
    bio: "I build accessible experiences for growing teams.",
    phone: null,
    location: "Lagos, Nigeria",
    resumeUrl: "https://example.com/amara-resume.pdf",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    user: {
      id: "candidate-amara",
      name: "Amara Okafor",
      email: "amara.okafor@example.com",
    },
  },
};

const unscoredApplication: RecruiterPipelineApplication = {
  ...amaraApplication,
  id: "application-jordan",
  candidateProfileId: "candidate-profile-jordan",
  stage: "OFFER",
  fitScore: null,
  aiScoringStatus: "failed",
  candidateProfile: {
    ...amaraApplication.candidateProfile,
    id: "candidate-profile-jordan",
    user: {
      id: "candidate-jordan",
      name: "Jordan Lee",
      email: "jordan.lee@example.com",
    },
  },
};

const recruiterJob: RecruiterJobRecord = {
  id: "job-1",
  companyId: "company-1",
  createdById: "recruiter-1",
  title: "Senior Product Engineer",
  description: "Build the product and technical foundations.",
  location: "Remote",
  status: "OPEN",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 6,
  isRemote: true,
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  skills: [],
  applicantCount: 2,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z",
};

function queryState(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data: [],
    error: null,
    isError: false,
    isFetching: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
    ...overrides,
  };
}

function mutationState(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    isPending: false,
    mutate: vi.fn(),
    variables: undefined,
    ...overrides,
  };
}

function renderPage(jobId?: string) {
  const path = jobId ? `/recruiter/pipeline/${jobId}` : "/recruiter/pipeline";

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/recruiter/pipeline" element={<RecruiterPipelinePage />} />
        <Route
          path="/recruiter/pipeline/:jobId"
          element={<RecruiterPipelinePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Invokes the board's onMove exactly as a completed drag would. */
function drop(
  application: RecruiterPipelineApplication,
  stage: RecruiterMutableApplicationStage,
) {
  const onMove = boardProps.current?.onMove as (
    application: RecruiterPipelineApplication,
    stage: RecruiterMutableApplicationStage,
  ) => void;
  onMove(application, stage);
}

beforeEach(() => {
  vi.clearAllMocks();
  boardProps.current = null;
  useApplicationsByJob.mockReturnValue(queryState());
  useRecruiterJobs.mockReturnValue(queryState({ data: [recruiterJob] }));
  useRescoreApplication.mockReturnValue(mutationState());
  useUpdateApplicationInterview.mockReturnValue(mutationState());
  useUpdateApplicationStage.mockReturnValue(mutationState());
  useRealtime.mockReturnValue({ status: "open", isDegraded: false });
  useCompanyProfile.mockReturnValue({
    data: { subscriptionTier: "PRO" },
    isSuccess: true,
    isLoading: false,
  });
});

describe("RecruiterPipelinePage", () => {
  it("shows a job selector without attempting an unscoped pipeline", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: undefined, isSuccess: false }),
    );

    renderPage();

    expect(useApplicationsByJob).toHaveBeenCalledWith(undefined);
    expect(
      screen.getByRole("heading", { name: "Choose a job" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open pipeline" })).toHaveAttribute(
      "href",
      `/recruiter/pipeline/${recruiterJob.id}`,
    );
    expect(screen.queryByTestId("pipeline-board")).not.toBeInTheDocument();
  });

  it("shows loading placeholders for the selected job", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: undefined, isLoading: true, isSuccess: false }),
    );

    renderPage("job-1");

    expect(useApplicationsByJob).toHaveBeenCalledWith("job-1");
    expect(screen.getByLabelText("Loading pipeline")).toBeInTheDocument();
  });

  it("shows the API error and lets the recruiter retry", async () => {
    const refetch = vi.fn();
    useApplicationsByJob.mockReturnValue(
      queryState({
        data: undefined,
        error: {
          isAxiosError: true,
          response: {
            status: 500,
            data: { error: "The pipeline service is unavailable." },
          },
        },
        isError: true,
        isSuccess: false,
        refetch,
      }),
    );
    const user = userEvent.setup();

    renderPage("job-1");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The pipeline service is unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows an empty pipeline state", () => {
    renderPage("job-1");

    expect(
      screen.getByRole("heading", { name: "No applications yet" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("pipeline-board")).not.toBeInTheDocument();
  });

  it("hands the board every visible application", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication, unscoredApplication] }),
    );

    renderPage("job-1");

    const board = screen.getByTestId("pipeline-board");
    expect(within(board).getByText("Amara Okafor in APPLIED")).toBeInTheDocument();
    expect(within(board).getByText("Jordan Lee in OFFER")).toBeInTheDocument();
    expect(
      screen.getByText("Showing 2 of 2 candidates."),
    ).toBeInTheDocument();
  });

  it("filters candidates by the minimum fit score", async () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication, unscoredApplication] }),
    );
    const user = userEvent.setup();

    renderPage("job-1");
    await user.clear(screen.getByLabelText("Minimum fit score"));
    await user.type(screen.getByLabelText("Minimum fit score"), "80");

    const board = screen.getByTestId("pipeline-board");
    expect(within(board).getByText("Amara Okafor in APPLIED")).toBeInTheDocument();
    expect(within(board).queryByText(/Jordan Lee/)).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 candidates.")).toBeInTheDocument();
  });

  it("moves a dropped candidate through the shared stage mutation", () => {
    const mutate = vi.fn();
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));

    renderPage("job-1");
    drop(amaraApplication, "REVIEWED");

    expect(mutate).toHaveBeenCalledWith(
      {
        applicationId: "application-amara",
        jobId: "job-1",
        stage: "REVIEWED",
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("offers to schedule after a drop into interviewing", async () => {
    const mutate = vi.fn(
      (_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));

    renderPage("job-1");
    drop(amaraApplication, "INTERVIEWING");

    expect(toastSuccess).toHaveBeenCalledWith(
      "Amara Okafor moved to interviewing.",
    );
    // The move already happened — scheduling stays optional.
    expect(
      await screen.findByLabelText(/moved to interviewing/),
    ).toBeInTheDocument();
  });

  it("does not offer to schedule when a date already exists", () => {
    const mutate = vi.fn(
      (_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    const scheduled = {
      ...amaraApplication,
      interviewDate: "2026-08-05T13:30:00.000Z",
    };
    useApplicationsByJob.mockReturnValue(queryState({ data: [scheduled] }));
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));

    renderPage("job-1");
    drop(scheduled, "INTERVIEWING");

    expect(
      screen.queryByLabelText(/moved to interviewing/),
    ).not.toBeInTheDocument();
  });

  it("saves the date from the post-drop prompt", async () => {
    const stageMutate = vi.fn(
      (_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    const interviewMutate = vi.fn();
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(
      mutationState({ mutate: stageMutate }),
    );
    useUpdateApplicationInterview.mockReturnValue(
      mutationState({ mutate: interviewMutate }),
    );
    const user = userEvent.setup();

    renderPage("job-1");
    drop(amaraApplication, "INTERVIEWING");

    await user.type(
      await screen.findByLabelText(/moved to interviewing/),
      "2026-08-05T13:30",
    );
    await user.click(screen.getByRole("button", { name: "Save date" }));

    expect(interviewMutate).toHaveBeenCalledWith(
      {
        applicationId: "application-amara",
        jobId: "job-1",
        candidateProfileId: "candidate-profile-amara",
        interviewDate: new Date("2026-08-05T13:30").toISOString(),
      },
      expect.anything(),
    );
  });

  it("explains a rejected move after the board rolls back", () => {
    const failure = {
      isAxiosError: true,
      response: {
        status: 422,
        data: { error: "A candidate can't be moved back to applied." },
      },
    };
    const mutate = vi.fn(
      (_input: unknown, options: { onError: (error: unknown) => void }) =>
        options.onError(failure),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));

    renderPage("job-1");
    drop(amaraApplication, "OFFER");

    expect(toastError).toHaveBeenCalledWith(
      "A candidate can't be moved back to applied.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("surfaces a drop the board itself refused", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );

    renderPage("job-1");
    (boardProps.current?.onRefuse as (message: string) => void)(
      "A candidate can't be moved back to applied.",
    );

    expect(toastError).toHaveBeenCalledWith(
      "A candidate can't be moved back to applied.",
    );
  });

  it("queues every unscored application for rescoring", async () => {
    const mutate = vi.fn(
      (_input: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess(),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication, unscoredApplication] }),
    );
    useRescoreApplication.mockReturnValue(mutationState({ mutate }));
    const user = userEvent.setup();

    renderPage("job-1");
    await user.click(
      screen.getByRole("button", { name: /Rescore 1 unscored/ }),
    );

    expect(mutate).toHaveBeenCalledWith(
      { applicationId: "application-jordan", jobId: "job-1" },
      expect.anything(),
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      "Jordan Lee's fit score was queued.",
    );
  });

  it("locks the bulk rescore action for a Free-tier company instead of leaving it clickable-but-broken", () => {
    useCompanyProfile.mockReturnValue({
      data: { subscriptionTier: "FREE" },
      isSuccess: true,
      isLoading: false,
    });
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication, unscoredApplication] }),
    );

    renderPage("job-1");

    const button = screen.getByRole("button", { name: /Rescore 1 unscored/ });
    expect(button).toBeDisabled();
  });

  it("warns when live updates are disconnected", () => {
    useRealtime.mockReturnValue({ status: "reconnecting", isDegraded: true });
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );

    renderPage("job-1");

    expect(screen.getByRole("status")).toHaveTextContent(
      /Live updates are reconnecting/,
    );
  });
});
