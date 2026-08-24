import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobDetailPage } from "@/pages/jobs/JobDetailPage";

const {
  usePublicJob,
  useMyApplications,
  useApplyToJob,
  useApplicationPercentile,
  useSkills,
  useAuth,
  toastSuccess,
  toastInfo,
  toastError,
  toastWarning,
  resumeReviewResultRef,
} = vi.hoisted(() => ({
  usePublicJob: vi.fn(),
  useMyApplications: vi.fn(),
  useApplyToJob: vi.fn(),
  useApplicationPercentile: vi.fn(),
  useSkills: vi.fn(),
  useAuth: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  // Lets a test drive the gating flow without a real AI call: set this
  // before rendering, then click "Simulate AI review" to report it upward
  // exactly as the real component's onResult would.
  resumeReviewResultRef: {
    current: {
      score: 80,
      pros: [] as string[],
      cons: [] as string[],
      suggestions: [] as string[],
    },
  },
}));

vi.mock("@/features/jobs/hooks", () => ({
  usePublicJob: (jobId: string | undefined) => usePublicJob(jobId),
}));

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: (enabled?: boolean) => useMyApplications(enabled),
  useApplyToJob: () => useApplyToJob(),
  useApplicationPercentile: () => useApplicationPercentile(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/features/candidate/hooks", () => ({
  useSkills: (enabled?: boolean) => useSkills(enabled),
}));

// Easy Apply has its own tests. The small trigger lets this page suite verify
// that its onApplied callback immediately switches the surrounding page state.
vi.mock("@/features/candidate/components/EasyApplyButton", () => ({
  EasyApplyButton: ({
    onApplied,
    onAlreadyApplied,
  }: {
    onApplied: (application: { id: string; stage: "APPLIED" }) => void;
    onAlreadyApplied: () => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onApplied({ id: "easy-application-1", stage: "APPLIED" })
        }
      >
        Simulate Easy Apply
      </button>
      <button type="button" onClick={onAlreadyApplied}>
        Simulate Easy Apply duplicate
      </button>
    </>
  ),
}));

// AI resume review has its own tests; these cases cover the apply flow, and
// this component's real hook needs a QueryClientProvider this suite doesn't set up.
// Stubbed as a single button so the gating-flow tests below can still drive
// a review result into the page exactly as the real component's onResult would.
vi.mock("@/features/applications/components/ResumeAIReview", () => ({
  ResumeAIReview: ({ onResult }: { onResult: (result: unknown) => void }) => (
    <button type="button" onClick={() => onResult(resumeReviewResultRef.current)}>
      Simulate AI review
    </button>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    info: toastInfo,
    error: toastError,
    warning: toastWarning,
  },
}));

const job = {
  id: "job-1",
  title: "Senior Platform Engineer",
  description: "Build a dependable developer platform.",
  location: "Remote",
  status: "OPEN",
  createdAt: "2026-07-01T00:00:00.000Z",
  employmentType: "FULL_TIME",
  experienceMin: 4,
  experienceMax: 8,
  isRemote: true,
  salaryMin: 100_000,
  salaryMax: 140_000,
  salaryCurrency: "USD",
  company: {
    id: "company-1",
    name: "Northstar Labs",
    website: "https://northstar.example",
    logoUrl: "https://northstar.example/logo.png",
    description: "A product studio building dependable tools for small teams.",
  },
  skills: [
    { id: "skill-1", name: "TypeScript" },
    { id: "skill-2", name: "Node.js" },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/jobs/job-1"]}>
      <Routes>
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function arrangeCandidate({
  mutateAsync = vi.fn().mockResolvedValue({
    id: "application-1",
    jobId: "job-1",
    stage: "APPLIED",
  }),
  applications = [],
}: {
  mutateAsync?: ReturnType<typeof vi.fn>;
  applications?: unknown[];
} = {}) {
  const refetch = vi.fn();

  useAuth.mockReturnValue({
    user: {
      id: "candidate-1",
      name: "Amara Okafor",
      email: "amara.okafor@example.com",
      role: "CANDIDATE",
    },
    currentRole: "candidate",
    isLoading: false,
  });
  usePublicJob.mockReturnValue({
    data: job,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  useMyApplications.mockReturnValue({
    data: applications,
    isLoading: false,
    isError: false,
    refetch,
  });
  useApplyToJob.mockReturnValue({
    data: undefined,
    isPending: false,
    variables: undefined,
    mutateAsync,
  });

  return { mutateAsync, refetch };
}

beforeEach(() => {
  vi.clearAllMocks();
  resumeReviewResultRef.current = { score: 80, pros: [], cons: [], suggestions: [] };
  // Idle by default — the percentile UI has its own tests; these cases only
  // need it to not blow up when JobDetailPage calls .mutate()/.reset() on it.
  useApplicationPercentile.mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    data: undefined,
  });
  useSkills.mockReturnValue({
    data: [],
    isSuccess: true,
    isError: false,
  });
});

describe("JobDetailPage company cross-navigation", () => {
  it("links to the company's careers page from the header and the snapshot", () => {
    arrangeCandidate();

    renderPage();

    expect(
      screen.getByRole("link", {
        name: "View all open roles at Northstar Labs",
      }),
    ).toHaveAttribute("href", "/careers/company-1");
    expect(
      screen.getByRole("link", { name: "Northstar Labs" }),
    ).toHaveAttribute("href", "/careers/company-1");
    expect(
      screen.getByText(
        "A product studio building dependable tools for small teams.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByAltText("Northstar Labs logo")).toHaveLength(2);
  });
});

describe("JobDetailPage candidate context", () => {
  it("highlights matched required skills and reports the count", () => {
    arrangeCandidate();
    useSkills.mockReturnValue({
      data: [{ id: "skill-1", name: "TypeScript" }],
      isSuccess: true,
      isError: false,
    });

    renderPage();

    expect(useSkills).toHaveBeenCalledWith(true);
    expect(
      screen.getByText("You match 1 of 2 required skills."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("TypeScript: matched")).toBeInTheDocument();
    expect(screen.getByLabelText("Node.js: not matched")).toBeInTheDocument();
  });

  it("does not request or render skill match for an anonymous visitor", () => {
    useAuth.mockReturnValue({
      user: null,
      currentRole: null,
      isLoading: false,
    });
    usePublicJob.mockReturnValue({
      data: job,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useMyApplications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    useApplyToJob.mockReturnValue({
      data: undefined,
      isPending: false,
      variables: undefined,
      mutateAsync: vi.fn(),
    });

    renderPage();

    expect(useSkills).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/You match/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in to apply" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in to apply (mobile)" }),
    ).toBeInTheDocument();
  });
});

describe("JobDetailPage candidate application action", () => {
  it("disables the application action while submission is pending", () => {
    arrangeCandidate();
    useApplyToJob.mockReturnValue({
      data: undefined,
      isPending: true,
      variables: { jobId: "job-1" },
      mutateAsync: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("button", { name: "Applying..." }),
    ).toBeDisabled();
  });

  it("submits an application and reports success", async () => {
    const { mutateAsync } = arrangeCandidate();
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Senior Platform Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Full time")).toHaveLength(2);
    expect(screen.getByText("Remote available")).toBeInTheDocument();
    expect(screen.getByText("4–8 years experience")).toBeInTheDocument();
    expect(screen.getAllByText("$100,000 – $140,000")).toHaveLength(2);
    expect(usePublicJob).toHaveBeenCalledWith("job-1");
    expect(useMyApplications).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      jobId: "job-1",
      onUploadProgress: expect.any(Function),
    });
    expect(toastSuccess).toHaveBeenCalledWith("Application submitted");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("submits the selected PDF with the application", async () => {
    const { mutateAsync } = arrangeCandidate();
    const user = userEvent.setup();
    const file = new File(["resume"], "amara.pdf", {
      type: "application/pdf",
    });
    renderPage();

    await user.upload(
      screen.getByLabelText("CV for this application"),
      file,
    );
    expect(screen.getByText("amara.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      jobId: "job-1",
      resumeFile: file,
      onUploadProgress: expect.any(Function),
    });
  });

  it("rejects an unsupported file before submission", async () => {
    const { mutateAsync } = arrangeCandidate();
    const user = userEvent.setup({ applyAccept: false });
    renderPage();

    await user.upload(
      screen.getByLabelText("CV for this application"),
      new File(["image"], "photo.png", { type: "image/png" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a PDF or DOCX file.",
    );
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("handles an already-applied conflict without showing an error", async () => {
    const conflict = {
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: "You have already applied to this job" },
      },
    };
    const mutateAsync = vi.fn().mockRejectedValue(conflict);
    const { refetch } = arrangeCandidate({ mutateAsync });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(screen.getByText("Application submitted")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "View application timeline" }),
    ).toHaveAttribute("href", "/applications");
    expect(refetch).toHaveBeenCalledOnce();
    expect(toastInfo).toHaveBeenCalledWith(
      "You've already applied to this role.",
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows an existing application's stage and links to its timeline", () => {
    arrangeCandidate({
      applications: [
        {
          id: "application-existing",
          jobId: "job-1",
          stage: "INTERVIEWING",
        },
      ],
    });

    renderPage();

    expect(screen.getByText(/Current stage: Interviewing/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View application timeline" }),
    ).toHaveAttribute(
      "href",
      "/applications#application-application-existing",
    );
  });

  it("switches to the applied state immediately after Easy Apply", async () => {
    const { refetch } = arrangeCandidate();
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Simulate Easy Apply" }),
    );

    expect(screen.getByText("Application submitted")).toBeInTheDocument();
    expect(screen.getByText(/Current stage: Applied/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View application timeline" }),
    ).toHaveAttribute(
      "href",
      "/applications#application-easy-application-1",
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("switches to the applied state when Easy Apply reports a duplicate", async () => {
    const { refetch } = arrangeCandidate();
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Simulate Easy Apply duplicate" }),
    );

    expect(screen.getByText("Application submitted")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View application timeline" }),
    ).toHaveAttribute("href", "/applications");
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows a retry state instead of Apply when application status fails", async () => {
    arrangeCandidate();
    const refetch = vi.fn();
    useMyApplications.mockReturnValue({
      data: undefined,
      error: {
        isAxiosError: true,
        response: { data: { error: "Application status is unavailable." } },
      },
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    });
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Application status is unavailable.",
    );
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Simulate Easy Apply" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Retry status check" }),
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("does not trust cached candidate data while it is refetching", () => {
    arrangeCandidate();
    useMyApplications.mockReturnValue({
      data: [{ id: "stale-application", jobId: "job-1", stage: "OFFER" }],
      error: null,
      isLoading: false,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    });
    useSkills.mockReturnValue({
      data: [{ id: "skill-1", name: "TypeScript" }],
      isSuccess: true,
      isFetching: true,
      isError: false,
    });

    renderPage();

    expect(screen.queryByText("Application submitted")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking application status...",
    );
    expect(screen.queryByText(/You match/)).not.toBeInTheDocument();
  });

  it("shows the API message for a non-conflict application failure", async () => {
    const failure = {
      isAxiosError: true,
      response: {
        status: 500,
        data: { error: "Application service is unavailable." },
      },
    };
    arrangeCandidate({
      mutateAsync: vi.fn().mockRejectedValue(failure),
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(toastError).toHaveBeenCalledWith(
      "Application service is unavailable.",
    );
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("shows a draft as ready to submit and uses the draft success copy", async () => {
    const draft = {
      id: "application-draft",
      jobId: "job-1",
      stage: "DRAFT",
    };
    const { mutateAsync } = arrangeCandidate({ applications: [draft] });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Submit application" }),
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      jobId: "job-1",
      onUploadProgress: expect.any(Function),
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      "Draft application submitted",
    );
  });
});

describe("JobDetailPage AI review pre-submit warning", () => {
  it("applies normally with no warning when the candidate never ran a review", () => {
    arrangeCandidate();
    renderPage();

    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.queryByText(/Your AI review found/)).not.toBeInTheDocument();
  });

  it("applies normally when a review ran but flagged no gaps", async () => {
    resumeReviewResultRef.current = {
      score: 90,
      pros: ["Strong match"],
      cons: [],
      suggestions: [],
    };
    arrangeCandidate();
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Simulate AI review" }));

    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.queryByText(/Your AI review found/)).not.toBeInTheDocument();
  });

  it("blocks the apply panel behind a warning when the review flagged gaps, until acknowledged", async () => {
    resumeReviewResultRef.current = {
      score: 40,
      pros: [],
      cons: ["No cloud experience", "Missing leadership examples"],
      suggestions: ["Add a cloud project"],
    };
    arrangeCandidate();
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Simulate AI review" }));

    expect(screen.getByText("Your AI review found 2 gaps")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Apply anyway" }));

    expect(screen.queryByText(/Your AI review found/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});
