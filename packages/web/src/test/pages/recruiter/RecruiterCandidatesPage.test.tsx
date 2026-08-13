import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterCandidatesPage } from "@/pages/recruiter/RecruiterCandidatesPage";
import type { RecruiterCandidateRecord } from "@/types/recruiter";

const { useRecruiterCandidates, useRecruiterTags } = vi.hoisted(() => ({
  useRecruiterCandidates: vi.fn(),
  useRecruiterTags: vi.fn(),
}));

vi.mock("@/features/recruiter/hooks", () => ({
  useRecruiterCandidates: () => useRecruiterCandidates(),
  useRecruiterTags: () => useRecruiterTags(),
  // RecruiterCandidatesPage now seeds its initial poolStatus filter from
  // this constant (features/recruiter/hooks.ts) so the sidebar's opportunistic
  // candidate-count badge peeks at the exact same query-cache entry.
  DEFAULT_CANDIDATE_FILTERS: { poolStatus: "all" },
}));

const amara: RecruiterCandidateRecord = {
  id: "profile-1",
  userId: "candidate-1",
  headline: "Product engineer",
  bio: "Builds thoughtful products.",
  phone: null,
  location: "Lagos",
  resumeUrl: "https://example.com/resume.pdf",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  user: {
    id: "candidate-1",
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterCandidates.mockReturnValue({
    data: [amara],
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
  useRecruiterTags.mockReturnValue({ data: [], isLoading: false });
});

describe("RecruiterCandidatesPage", () => {
  it("shows API-backed candidate identity and working actions", () => {
    render(
      <MemoryRouter>
        <RecruiterCandidatesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    expect(screen.getByText("amara.okafor@example.com")).toHaveAttribute(
      "href",
      "mailto:amara.okafor@example.com",
    );
    expect(screen.getByRole("link", { name: "View profile" })).toHaveAttribute(
      "href",
      "/recruiter/candidates/profile-1",
    );
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      "https://example.com/resume.pdf",
    );
  });

  it("filters candidates without changing the API scope", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RecruiterCandidatesPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole("textbox", { name: "Search candidates" }), "Beirut");
    expect(screen.queryByText("Amara Okafor")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "No candidates match your filters",
      }),
    ).toBeInTheDocument();
  });
});
