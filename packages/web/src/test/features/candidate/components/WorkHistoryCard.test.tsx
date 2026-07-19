import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkHistoryCard } from "@/features/candidate/components/WorkHistoryCard";

const useExperience = vi.fn();
const deleteExperienceMutateAsync = vi.fn();

vi.mock("@/features/candidate/hooks", () => ({
  useExperience: () => useExperience(),
  useCreateExperience: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateExperience: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExperience: () => ({
    mutateAsync: deleteExperienceMutateAsync,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WorkHistoryCard", () => {
  it("shows a setup prompt and hides Add when no profile exists yet", () => {
    useExperience.mockReturnValue({ isLoading: false, isError: false, data: undefined });
    render(<WorkHistoryCard profileExists={false} />);

    expect(
      screen.getByText(/set up your profile above to start adding work experience/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add experience/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when the profile has no experience yet", () => {
    useExperience.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<WorkHistoryCard profileExists />);

    expect(screen.getByText(/no work experience added yet/i)).toBeInTheDocument();
  });

  it("renders an ongoing role as 'Present'", () => {
    useExperience.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: "e1",
          candidateProfileId: "p1",
          company: "Paystack",
          title: "Senior Software Engineer",
          startDate: "2021-03-01",
          endDate: null,
          description: "Led a team of four.",
          createdAt: "2021-03-01T00:00:00.000Z",
          updatedAt: "2021-03-01T00:00:00.000Z",
        },
      ],
    });

    render(<WorkHistoryCard profileExists />);

    expect(screen.getByText("Paystack")).toBeInTheDocument();
    expect(screen.getByText(/present/i)).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and deletes on confirm", async () => {
    const experience = {
      id: "e1",
      candidateProfileId: "p1",
      company: "Paystack",
      title: "Senior Software Engineer",
      startDate: "2021-03-01",
      endDate: null,
      description: undefined,
      createdAt: "2021-03-01T00:00:00.000Z",
      updatedAt: "2021-03-01T00:00:00.000Z",
    };
    useExperience.mockReturnValue({ isLoading: false, isError: false, data: [experience] });
    deleteExperienceMutateAsync.mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<WorkHistoryCard profileExists />);

    await user.click(
      screen.getByRole("button", { name: /remove senior software engineer at paystack/i }),
    );

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteExperienceMutateAsync).toHaveBeenCalledWith("e1");

    confirmSpy.mockRestore();
  });

  it("does not delete when the confirmation is declined", async () => {
    const experience = {
      id: "e1",
      candidateProfileId: "p1",
      company: "Paystack",
      title: "Senior Software Engineer",
      startDate: "2021-03-01",
      endDate: null,
      description: undefined,
      createdAt: "2021-03-01T00:00:00.000Z",
      updatedAt: "2021-03-01T00:00:00.000Z",
    };
    useExperience.mockReturnValue({ isLoading: false, isError: false, data: [experience] });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = userEvent.setup();
    render(<WorkHistoryCard profileExists />);

    await user.click(
      screen.getByRole("button", { name: /remove senior software engineer at paystack/i }),
    );

    expect(deleteExperienceMutateAsync).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("opens the add-experience form", async () => {
    useExperience.mockReturnValue({ isLoading: false, isError: false, data: [] });
    const user = userEvent.setup();
    render(<WorkHistoryCard profileExists />);

    await user.click(screen.getByRole("button", { name: /add experience/i }));

    expect(screen.getByLabelText(/^company$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/this is my current role/i)).toBeChecked();
  });
});
