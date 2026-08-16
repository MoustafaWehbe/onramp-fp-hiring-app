import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeAIReview } from "@/features/applications/components/ResumeAIReview";

const { toastError, useReviewResumeForJob } = vi.hoisted(() => ({
  toastError: vi.fn(),
  useReviewResumeForJob: vi.fn(),
}));

vi.mock("@/features/candidate/hooks", () => ({
  useReviewResumeForJob,
}));

vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

function renderReview(props: Partial<Parameters<typeof ResumeAIReview>[0]> = {}) {
  const onResult = vi.fn();
  render(
    <ResumeAIReview jobId="job-1" resumeFile={null} onResult={onResult} {...props} />,
  );
  return { onResult };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ResumeAIReview", () => {
  it("runs a review for this job and reports the result up to the caller", async () => {
    const mutate = vi.fn((_input, options) =>
      options.onSuccess({
        score: 72,
        pros: ["Strong React background"],
        cons: ["No cloud infrastructure experience mentioned"],
        suggestions: ["Add a project that used AWS or GCP"],
      }),
    );
    useReviewResumeForJob.mockReturnValue({
      mutate,
      isPending: false,
      data: undefined,
    });
    const user = userEvent.setup();
    const { onResult } = renderReview();

    await user.click(screen.getByRole("button", { name: "Review with AI" }));

    expect(mutate).toHaveBeenCalledWith(
      { jobId: "job-1", resumeFile: null },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(onResult).toHaveBeenCalledWith({
      score: 72,
      pros: ["Strong React background"],
      cons: ["No cloud infrastructure experience mentioned"],
      suggestions: ["Add a project that used AWS or GCP"],
    });
  });

  it("shows the score, pros, cons, and suggestions once a review result exists", () => {
    useReviewResumeForJob.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: {
        score: 72,
        pros: ["Strong React background"],
        cons: ["No cloud infrastructure experience mentioned"],
        suggestions: ["Add a project that used AWS or GCP"],
      },
    });

    renderReview();

    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("Strong React background")).toBeInTheDocument();
    expect(
      screen.getByText("No cloud infrastructure experience mentioned"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add a project that used AWS or GCP"),
    ).toBeInTheDocument();
  });

  it("sends the currently staged CV file along with the job id", async () => {
    const mutate = vi.fn();
    useReviewResumeForJob.mockReturnValue({
      mutate,
      isPending: false,
      data: undefined,
    });
    const file = new File(["resume"], "amara.pdf", { type: "application/pdf" });
    const user = userEvent.setup();
    renderReview({ resumeFile: file });

    await user.click(screen.getByRole("button", { name: "Review with AI" }));

    expect(mutate).toHaveBeenCalledWith(
      { jobId: "job-1", resumeFile: file },
      expect.anything(),
    );
  });

  it("surfaces the API error message when the review fails", async () => {
    const mutate = vi.fn((_input, options) =>
      options.onError({
        isAxiosError: true,
        response: { status: 422, data: { error: "Add a resume first" } },
      }),
    );
    useReviewResumeForJob.mockReturnValue({
      mutate,
      isPending: false,
      data: undefined,
    });
    const user = userEvent.setup();
    renderReview();

    await user.click(screen.getByRole("button", { name: "Review with AI" }));

    expect(toastError).toHaveBeenCalledWith("Add a resume first");
  });

  it("disables the button and relabels it while a review is pending", () => {
    useReviewResumeForJob.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      data: undefined,
    });

    renderReview();

    expect(screen.getByRole("button", { name: "Reviewing…" })).toBeDisabled();
  });

  it("relabels the button to review again once a result exists", () => {
    useReviewResumeForJob.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: {
        score: 50,
        pros: ["ok"],
        cons: ["ok"],
        suggestions: ["ok"],
      },
    });

    renderReview();

    expect(
      screen.getByRole("button", { name: "Review again" }),
    ).toBeInTheDocument();
  });
});
