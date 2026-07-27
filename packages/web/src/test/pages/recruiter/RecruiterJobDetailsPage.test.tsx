import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterJobDetailsPage } from "@/pages/recruiter/RecruiterJobDetailsPage";
import type { RecruiterJobRecord } from "@/types/jobs";

const { useRecruiterJob } = vi.hoisted(() => ({
  useRecruiterJob: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJob,
}));

const job: RecruiterJobRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  createdById: "33333333-3333-4333-8333-333333333333",
  title: "Platform Engineer",
  description: "Build reliable hiring workflows.",
  employmentType: "CONTRACT",
  experienceMin: 2,
  experienceMax: 5,
  location: null,
  isRemote: true,
  salaryMin: 80_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  skills: [{ id: "skill-typescript", name: "TypeScript" }],
  status: "OPEN",
  applicantCount: 4,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/recruiter/jobs/${job.id}`]}>
      <Routes>
        <Route
          path="/recruiter/jobs/:id"
          element={<RecruiterJobDetailsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterJob.mockReturnValue({
    data: job,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("RecruiterJobDetailsPage", () => {
  it("shows structured job data, real applicant count, and UUID actions", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: job.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contract")).toBeInTheDocument();
    expect(screen.getByText("Remote available")).toBeInTheDocument();
    expect(screen.getByText("$80,000 – $120,000")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit job" })).toHaveAttribute(
      "href",
      `/recruiter/jobs/${job.id}/edit`,
    );
    expect(screen.getByRole("link", { name: "View pipeline" })).toHaveAttribute(
      "href",
      `/recruiter/pipeline/${job.id}`,
    );
  });
});
