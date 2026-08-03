import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EasyApplyButton } from "@/features/candidate/components/EasyApplyButton";

const { toastError, toastSuccess, useEasyApply, useEasyApplyReadiness } =
  vi.hoisted(() => ({
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    useEasyApply: vi.fn(),
    useEasyApplyReadiness: vi.fn(),
  }));

vi.mock("@/features/candidate/hooks", () => ({
  useEasyApply,
  useEasyApplyReadiness,
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

function readiness(overrides = {}) {
  return {
    data: {
      ready: true,
      hasResumeOnFile: true,
      hasProfileContent: true,
      missing: [],
      ...overrides,
    },
    isLoading: false,
    isError: false,
  };
}

function renderButton(props = {}) {
  return render(
    <MemoryRouter>
      <EasyApplyButton jobId="job-1" {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useEasyApplyReadiness.mockReturnValue(readiness());
  useEasyApply.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe("EasyApplyButton", () => {
  it("applies with the standing profile and needs no file", async () => {
    const mutate = vi.fn((_input, options) => options.onSuccess());
    useEasyApply.mockReturnValue({ mutate, isPending: false });
    const onApplied = vi.fn();
    const user = userEvent.setup();

    renderButton({ onApplied });
    await user.click(screen.getByRole("button", { name: "Easy Apply" }));

    expect(mutate).toHaveBeenCalledWith(
      { jobId: "job-1" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Applied with your profile.");
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it("sends a candidate with nothing to submit to their profile instead", () => {
    useEasyApplyReadiness.mockReturnValue(
      readiness({
        ready: false,
        hasResumeOnFile: false,
        hasProfileContent: false,
        missing: ["at least one skill, or a resume on file"],
      }),
    );

    renderButton();

    // No apply button at all — there would be nothing to snapshot or score.
    expect(
      screen.queryByRole("button", { name: "Easy Apply" }),
    ).not.toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: "Complete profile to Easy Apply",
    });
    expect(link).toHaveAttribute("href", "/candidate/profile");
    expect(link).toHaveAttribute(
      "title",
      "Add at least one skill, or a resume on file to use Easy Apply",
    );
  });

  it("surfaces the API message when applying fails", async () => {
    const mutate = vi.fn((_input, options) =>
      options.onError({
        isAxiosError: true,
        response: {
          status: 409,
          data: { error: "You have already applied for this job" },
        },
      }),
    );
    useEasyApply.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();

    renderButton();
    await user.click(screen.getByRole("button", { name: "Easy Apply" }));

    expect(toastError).toHaveBeenCalledWith(
      "You have already applied for this job",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("renders nothing until readiness is known", () => {
    useEasyApplyReadiness.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = renderButton();

    expect(container).toBeEmptyDOMElement();
  });
});
