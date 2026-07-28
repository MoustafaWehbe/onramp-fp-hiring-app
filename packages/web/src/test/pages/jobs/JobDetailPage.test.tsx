import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobDetailPage } from "@/pages/jobs/JobDetailPage";

const {
  usePublicJob,
  useMyApplications,
  useApplyToJob,
  useAuth,
  toastSuccess,
  toastInfo,
  toastError,
  toastWarning,
} = vi.hoisted(() => ({
  usePublicJob: vi.fn(),
  useMyApplications: vi.fn(),
  useApplyToJob: vi.fn(),
  useAuth: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  usePublicJob: (jobId: string | undefined) => usePublicJob(jobId),
}));

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: (enabled?: boolean) => useMyApplications(enabled),
  useApplyToJob: () => useApplyToJob(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuth(),
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
    logoUrl: null,
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
    expect(screen.getByText("Full time")).toBeInTheDocument();
    expect(screen.getByText("Remote available")).toBeInTheDocument();
    expect(screen.getByText("4–8 years experience")).toBeInTheDocument();
    expect(screen.getByText("$100,000 – $140,000")).toBeInTheDocument();
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
      expect(
        screen.getByRole("button", { name: "Already applied" }),
      ).toBeDisabled();
    });
    expect(refetch).toHaveBeenCalledOnce();
    expect(toastInfo).toHaveBeenCalledWith(
      "You've already applied to this role.",
    );
    expect(toastError).not.toHaveBeenCalled();
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
