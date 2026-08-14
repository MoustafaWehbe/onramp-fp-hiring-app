import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillsCard } from "@/features/candidate/components/SkillsCard";

const {
  useSkills,
  useSetSkills,
  mutateAsync,
  searchSkills,
  createSkill,
  toastSuccess,
} = vi.hoisted(() => ({
  useSkills: vi.fn(),
  useSetSkills: vi.fn(),
  mutateAsync: vi.fn(),
  searchSkills: vi.fn(),
  createSkill: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/features/candidate/hooks", () => ({
  useSkills,
  useSetSkills,
}));

vi.mock("@/features/skills/api", () => ({
  searchSkills,
  createSkill,
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSkills.mockReturnValue({
    data: [{ id: "skill-react", name: "React" }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  useSetSkills.mockReturnValue({ mutateAsync, isPending: false });
  searchSkills.mockResolvedValue([]);
  createSkill.mockResolvedValue({ id: "skill-rust", name: "Rust" });
  mutateAsync.mockResolvedValue([]);
});

describe("SkillsCard", () => {
  it("uses the shared free-form input to create and save a profile skill", async () => {
    const user = userEvent.setup();
    render(<SkillsCard profileExists />);

    await user.click(screen.getByRole("button", { name: "Edit skills" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search or add skills" }),
      "Rust",
    );
    await user.click(
      await screen.findByRole("option", {
        name: 'Add "Rust" as a new skill',
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(["skill-react", "skill-rust"]),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Skills updated");
  });
});
