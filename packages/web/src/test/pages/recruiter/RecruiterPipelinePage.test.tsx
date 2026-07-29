import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterPipelinePage } from "@/pages/recruiter/RecruiterPipelinePage";
import type { RecruiterPipelineApplication } from "@/types/applications";
import type { RecruiterJobRecord } from "@/types/jobs";

const {
  toastError,
  toastSuccess,
  useApplicationsByJob,
  useRecruiterJobs,
  useRescoreApplication,
  useUpdateApplicationStage,
} = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  useApplicationsByJob: vi.fn(),
  useRecruiterJobs: vi.fn(),
  useRescoreApplication: vi.fn(),
  useUpdateApplicationStage: vi.fn(),
}));

vi.mock("@/features/applications/hooks", () => ({
  useApplicationsByJob: (jobId: string | undefined) =>
    useApplicationsByJob(jobId),
  useRescoreApplication: () => useRescoreApplication(),
  useUpdateApplicationStage: () => useUpdateApplicationStage(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJobs: () => useRecruiterJobs(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
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
  aiSummary:
    "Amara's frontend product experience strongly matches this role.",
  aiStrengths: ["React delivery", "TypeScript depth"],
  aiGaps: ["Limited platform operations evidence"],
  aiScoredAt: "2026-07-27T10:01:00.000Z",
  aiScoringStatus: "completed",
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

const offeredApplication: RecruiterPipelineApplication = {
  ...amaraApplication,
  id: "application-jordan",
  candidateProfileId: "candidate-profile-jordan",
  stage: "OFFER",
  coverLetter: null,
  resumeOriginalFilename: null,
  resumeDownloadUrl: null,
  resumeUploadedAt: null,
  resumeParseSucceeded: null,
  parsedYearsExperience: null,
  parsedSkills: [],
  fitScore: null,
  aiSummary: null,
  aiStrengths: [],
  aiGaps: [],
  aiScoredAt: null,
  aiScoringStatus: "failed",
  candidateProfile: {
    ...amaraApplication.candidateProfile,
    id: "candidate-profile-jordan",
    userId: "candidate-jordan",
    headline: "Senior platform engineer",
    location: "Beirut, Lebanon",
    resumeUrl: null,
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
  const path = jobId
    ? `/recruiter/pipeline/${jobId}`
    : "/recruiter/pipeline";

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/recruiter/pipeline"
          element={<RecruiterPipelinePage />}
        />
        <Route
          path="/recruiter/pipeline/:jobId"
          element={<RecruiterPipelinePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useApplicationsByJob.mockReturnValue(queryState());
  useRecruiterJobs.mockReturnValue(queryState({ data: [recruiterJob] }));
  useRescoreApplication.mockReturnValue(mutationState());
  useUpdateApplicationStage.mockReturnValue(mutationState());
});

describe("RecruiterPipelinePage", () => {
  it("shows a live job selector without attempting an unscoped pipeline", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({
        data: undefined,
        isSuccess: false,
      }),
    );

    renderPage();

    expect(useApplicationsByJob).toHaveBeenCalledWith(undefined);
    expect(
      screen.getByRole("heading", { name: "Choose a job" }),
    ).toBeInTheDocument();
    expect(screen.getByText(recruiterJob.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open pipeline" })).toHaveAttribute(
      "href",
      `/recruiter/pipeline/${recruiterJob.id}`,
    );
    expect(
      screen.queryByLabelText("Loading pipeline"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows loading placeholders for the selected job", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({
        data: undefined,
        isLoading: true,
        isSuccess: false,
      }),
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

  it("shows an empty pipeline and zero derived stage counts", () => {
    renderPage("job-1");

    const summary = screen.getByLabelText("Pipeline stage counts");
    expect(
      screen.getByRole("heading", { name: "No applications yet" }),
    ).toBeInTheDocument();
    expect(within(summary).getByText("Applied").nextElementSibling).toHaveTextContent(
      "0",
    );
    expect(
      within(summary).getByText("Interviewing").nextElementSibling,
    ).toHaveTextContent("0");
    expect(within(summary).getByText("Offer").nextElementSibling).toHaveTextContent(
      "0",
    );
  });

  it("renders real candidate details and derived stage counts", () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication, offeredApplication] }),
    );

    renderPage("job-1");

    const summary = screen.getByLabelText("Pipeline stage counts");
    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    expect(screen.getByText("amara.okafor@example.com")).toHaveAttribute(
      "href",
      "mailto:amara.okafor@example.com",
    );
    expect(
      screen.getByText("Product-minded software engineer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Lagos, Nigeria")).toBeInTheDocument();
    expect(
      screen.getByText(
        "I would love to help build a thoughtful hiring product.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View CV" }),
    ).toHaveAttribute(
      "href",
      "/api/applications/application-amara/resume",
    );
    expect(screen.getByText(/CV: amara-application-cv.pdf/)).toBeInTheDocument();
    expect(screen.getByText("Parsed experience: 6 years")).toBeInTheDocument();
    expect(
      screen.getByText("Parsed skills: React, TypeScript"),
    ).toBeInTheDocument();
    expect(screen.getByText("87% fit")).toBeInTheDocument();
    expect(screen.getByText("Not yet scored")).toBeInTheDocument();
    expect(
      screen.getByText("Showing 2 of 2 candidates, highest fit first."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "View profile" })[0],
    ).toHaveAttribute(
      "href",
      "/recruiter/candidates/candidate-profile-amara",
    );
    expect(within(summary).getByText("Applied").nextElementSibling).toHaveTextContent(
      "1",
    );
    expect(within(summary).getByText("Offer").nextElementSibling).toHaveTextContent(
      "1",
    );
    expect(
      within(summary).getByText("Interviewing").nextElementSibling,
    ).toHaveTextContent("0");
  });

  it("filters candidates by the minimum fit score", async () => {
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [offeredApplication, amaraApplication] }),
    );
    const user = userEvent.setup();

    renderPage("job-1");
    await user.clear(screen.getByLabelText("Minimum fit score"));
    await user.type(screen.getByLabelText("Minimum fit score"), "80");

    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
    expect(
      screen.getByText("Showing 1 of 2 candidates, highest fit first."),
    ).toBeInTheDocument();
  });

  it("shows a pending scoring state without inventing a score", () => {
    const pendingApplication: RecruiterPipelineApplication = {
      ...amaraApplication,
      fitScore: null,
      aiSummary: null,
      aiStrengths: [],
      aiGaps: [],
      aiScoredAt: null,
      aiScoringStatus: "pending",
    };
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [pendingApplication] }),
    );

    renderPage("job-1");

    expect(screen.getByText("Scoring")).toBeInTheDocument();
    expect(screen.queryByText(/% fit/)).not.toBeInTheDocument();
  });

  it("queues a failed application for rescoring", async () => {
    const mutate = vi.fn(
      (
        _input: unknown,
        options: { onSuccess: () => void },
      ) => options.onSuccess(),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [offeredApplication] }),
    );
    useRescoreApplication.mockReturnValue(mutationState({ mutate }));
    const user = userEvent.setup();

    renderPage("job-1");
    await user.click(screen.getByRole("button", { name: "Rescore" }));

    expect(mutate).toHaveBeenCalledWith(
      {
        applicationId: "application-jordan",
        jobId: "job-1",
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      "Jordan Lee's fit score was queued.",
    );
  });

  it("moves an eligible candidate to interviewing and reports success", async () => {
    const mutate = vi.fn(
      (
        _input: unknown,
        options: { onSuccess: () => void },
      ) => options.onSuccess(),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));
    const user = userEvent.setup();

    renderPage("job-1");
    await user.click(
      screen.getByRole("button", { name: "Move to interviewing" }),
    );

    expect(mutate).toHaveBeenCalledWith(
      {
        applicationId: "application-amara",
        jobId: "job-1",
        stage: "INTERVIEWING",
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      "Amara Okafor moved to interviewing.",
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("reports the API error when moving a candidate fails", async () => {
    const failure = {
      isAxiosError: true,
      response: {
        status: 500,
        data: { error: "Stage updates are temporarily unavailable." },
      },
    };
    const mutate = vi.fn(
      (
        _input: unknown,
        options: { onError: (error: unknown) => void },
      ) => options.onError(failure),
    );
    useApplicationsByJob.mockReturnValue(
      queryState({ data: [amaraApplication] }),
    );
    useUpdateApplicationStage.mockReturnValue(mutationState({ mutate }));
    const user = userEvent.setup();

    renderPage("job-1");
    await user.click(
      screen.getByRole("button", { name: "Move to interviewing" }),
    );

    expect(toastError).toHaveBeenCalledWith(
      "Stage updates are temporarily unavailable.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
