import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillsInput } from "@/components/skills/SkillsInput";
import type { SkillOption } from "@/types/skills";

const { searchSkills, createSkill } = vi.hoisted(() => ({
  searchSkills: vi.fn(),
  createSkill: vi.fn(),
}));

vi.mock("@/features/skills/api", () => ({
  searchSkills,
  createSkill,
}));

function TestInput({ initial = [] }: { initial?: SkillOption[] }) {
  const [skills, setSkills] = useState(initial);
  return <SkillsInput value={skills} onChange={setSkills} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchSkills.mockResolvedValue([]);
  createSkill.mockImplementation(async (name: string) => ({
    id: `created-${name.toLowerCase()}`,
    name,
  }));
});

describe("SkillsInput", () => {
  it("waits for a meaningful query, searches, and selects an existing skill", async () => {
    const user = userEvent.setup();
    searchSkills.mockResolvedValue([{ id: "skill-react", name: "React" }]);
    render(<TestInput />);

    const input = screen.getByRole("combobox", { name: "Search or add skills" });
    await user.type(input, "R");
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(searchSkills).not.toHaveBeenCalled();

    await user.type(input, "e");
    await waitFor(() => expect(searchSkills).toHaveBeenCalledWith("Re", expect.any(AbortSignal)));
    await user.click(await screen.findByRole("option", { name: "React" }));

    expect(screen.getByRole("button", { name: "Remove React" })).toBeInTheDocument();
    expect(createSkill).not.toHaveBeenCalled();
  });

  it("offers an explicit create option and suppresses casing duplicates", async () => {
    const user = userEvent.setup();
    render(<TestInput initial={[{ id: "skill-react", name: "React" }]} />);

    const input = screen.getByRole("combobox", { name: "Search or add skills" });
    await user.type(input, "Rustlings");
    await user.click(
      await screen.findByRole("option", {
        name: 'Add "Rustlings" as a new skill',
      }),
    );

    expect(createSkill).toHaveBeenCalledWith("Rustlings");
    expect(screen.getByRole("button", { name: "Remove Rustlings" })).toBeInTheDocument();

    await user.type(input, "react");
    await waitFor(() => expect(searchSkills).toHaveBeenLastCalledWith("react", expect.any(AbortSignal)));
    expect(
      screen.queryByRole("option", { name: 'Add "react" as a new skill' }),
    ).not.toBeInTheDocument();
  });

  it("removes only the selected association from the value", async () => {
    const user = userEvent.setup();
    render(<TestInput initial={[{ id: "skill-react", name: "React" }]} />);

    await user.click(screen.getByRole("button", { name: "Remove React" }));

    expect(screen.queryByText("React")).not.toBeInTheDocument();
    expect(createSkill).not.toHaveBeenCalled();
  });
});
