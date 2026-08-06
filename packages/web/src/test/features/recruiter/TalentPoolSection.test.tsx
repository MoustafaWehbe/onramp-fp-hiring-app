import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TalentPoolSection } from "@/features/recruiter/components/TalentPoolSection";
import type { RecruiterCandidateRecord } from "@/types/recruiter";

const {
  addToPool,
  createTag,
  deleteTag,
  invite,
  removeFromPool,
  updatePool,
  useRecruiterJobs,
  useRecruiterTags,
} = vi.hoisted(() => ({
  addToPool: { mutateAsync: vi.fn(), isPending: false },
  createTag: { mutateAsync: vi.fn(), isPending: false },
  deleteTag: { mutateAsync: vi.fn(), isPending: false },
  invite: { mutateAsync: vi.fn(), isPending: false },
  removeFromPool: { mutateAsync: vi.fn(), isPending: false },
  updatePool: { mutateAsync: vi.fn(), isPending: false },
  useRecruiterJobs: vi.fn(),
  useRecruiterTags: vi.fn(),
}));

vi.mock("@/features/recruiter/hooks", () => ({
  useAddCandidateToPool: () => addToPool,
  useCreateRecruiterTag: () => createTag,
  useDeleteRecruiterTag: () => deleteTag,
  useInviteCandidateToApply: () => invite,
  useRecruiterTags: () => useRecruiterTags(),
  useRemoveCandidateFromPool: () => removeFromPool,
  useUpdateCandidatePool: () => updatePool,
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJobs: () => useRecruiterJobs(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const candidate: RecruiterCandidateRecord = {
  id: "candidate-profile-1",
  userId: "candidate-1",
  headline: "Platform engineer",
  bio: null,
  phone: null,
  location: "Lagos",
  resumeUrl: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  user: {
    id: "candidate-1",
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
  },
  poolEntry: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterTags.mockReturnValue({
    data: [{ id: "tag-1", label: "Strong culture fit" }],
    isLoading: false,
  });
  useRecruiterJobs.mockReturnValue({
    data: [
      { id: "job-open", title: "Staff Engineer", status: "OPEN" },
      { id: "job-closed", title: "Closed Engineer", status: "CLOSED" },
    ],
    isLoading: false,
    isError: false,
  });
  addToPool.mutateAsync.mockResolvedValue({});
  invite.mutateAsync.mockResolvedValue({});
});

describe("TalentPoolSection", () => {
  it("adds a prior candidate with private notes and selected tags", async () => {
    const user = userEvent.setup();
    render(<TalentPoolSection candidate={candidate} />);

    await user.type(
      screen.getByLabelText("Private pool note"),
      "Revisit for a staff role.",
    );
    await user.click(screen.getByLabelText("Strong culture fit"));
    await user.click(
      screen.getByRole("button", { name: "Add to talent pool" }),
    );

    expect(addToPool.mutateAsync).toHaveBeenCalledWith({
      candidateId: candidate.id,
      input: {
        notes: "Revisit for a staff role.",
        tagIds: ["tag-1"],
      },
    });
    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Candidate added to the talent pool");
  });

  it("only offers open jobs and sends an invitation", async () => {
    const user = userEvent.setup();
    render(<TalentPoolSection candidate={candidate} />);

    const jobSelect = screen.getByLabelText("Open job");
    expect(
      screen.queryByRole("option", { name: "Closed Engineer" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(jobSelect, "job-open");
    await user.click(
      screen.getByRole("button", { name: "Send invitation" }),
    );

    expect(invite.mutateAsync).toHaveBeenCalledWith({
      candidateId: candidate.id,
      jobId: "job-open",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Invitation sent for Staff Engineer",
    );
  });

  it("shows the server's clear message when a selected job has since closed", async () => {
    invite.mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: "This job is no longer open" } },
    });
    const user = userEvent.setup();
    render(<TalentPoolSection candidate={candidate} />);

    await user.selectOptions(screen.getByLabelText("Open job"), "job-open");
    await user.click(
      screen.getByRole("button", { name: "Send invitation" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This job is no longer open",
    );
  });
});
