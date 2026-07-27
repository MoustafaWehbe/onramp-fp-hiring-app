import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterEditJobPage } from "@/pages/recruiter/RecruiterEditJobPage";
import type { RecruiterJobRecord } from "@/types/jobs";

const {
  useRecruiterJob,
  useUpdateRecruiterJob,
  mutateAsync,
  toastSuccess,
} = vi.hoisted(() => ({
  useRecruiterJob: vi.fn(),
  useUpdateRecruiterJob: vi.fn(),
  mutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJob,
  useUpdateRecruiterJob,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: vi.fn(),
  },
}));

const closedJob: RecruiterJobRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  createdById: "33333333-3333-4333-8333-333333333333",
  title: "Platform Engineer",
  description: "Build reliable hiring workflows.",
  employmentType: "FULL_TIME",
  experienceMin: 2,
  experienceMax: 5,
  location: "Beirut, Lebanon",
  isRemote: true,
  salaryMin: 80_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  skills: [{ id: "skill-typescript", name: "TypeScript" }],
  status: "CLOSED",
  applicantCount: 3,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[`/recruiter/jobs/${closedJob.id}/edit`]}
    >
      <Routes>
        <Route
          path="/recruiter/jobs/:id/edit"
          element={<RecruiterEditJobPage />}
        />
        <Route
          path="/recruiter/jobs"
          element={<p>Recruiter jobs destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterJob.mockReturnValue({
    data: closedJob,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  useUpdateRecruiterJob.mockReturnValue({
    mutateAsync,
    isPending: false,
  });
  mutateAsync.mockResolvedValue(closedJob);
});

describe("RecruiterEditJobPage", () => {
  it("preserves CLOSED status when saving an existing closed job", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText("Publishing status")).toHaveValue("CLOSED");
    expect(
      screen.getByRole("option", { name: "Closed" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        id: closedJob.id,
        input: {
          title: closedJob.title,
          description: closedJob.description,
          employmentType: closedJob.employmentType,
          experienceMin: closedJob.experienceMin,
          experienceMax: closedJob.experienceMax,
          location: closedJob.location,
          isRemote: closedJob.isRemote,
          salaryMin: closedJob.salaryMin,
          salaryMax: closedJob.salaryMax,
          salaryCurrency: closedJob.salaryCurrency,
          skills: ["TypeScript"],
          status: "CLOSED",
        },
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job closed");
    expect(
      await screen.findByText("Recruiter jobs destination"),
    ).toBeInTheDocument();
  });
});
