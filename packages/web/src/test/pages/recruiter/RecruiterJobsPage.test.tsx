import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterJobsPage } from "@/pages/recruiter/RecruiterJobsPage";
import type { RecruiterJobRecord } from "@/types/jobs";

const { useRecruiterJobs } = vi.hoisted(() => ({
  useRecruiterJobs: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  useRecruiterJobs,
}));

const recruiterJob: RecruiterJobRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  createdById: "33333333-3333-4333-8333-333333333333",
  title: "Senior Product Engineer",
  description: "Build the product and technical foundations for hiring teams.",
  location: null,
  status: "OPEN",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 6,
  isRemote: false,
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  skills: [{ id: "skill-react", name: "React" }],
  applicantCount: 7,
  createdAt: "2026-07-25T09:00:00.000Z",
  updatedAt: "2026-07-26T09:00:00.000Z",
};

function queryState(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RecruiterJobsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterJobs.mockReturnValue(queryState());
});

describe("RecruiterJobsPage", () => {
  it("shows job card placeholders while the recruiter jobs query loads", () => {
    useRecruiterJobs.mockReturnValue(
      queryState({
        data: undefined,
        isLoading: true,
      }),
    );

    renderPage();

    expect(
      screen.getByLabelText("Loading recruiter jobs"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: recruiterJob.title }),
    ).not.toBeInTheDocument();
  });

  it("shows the API error and retries the recruiter jobs query", async () => {
    const refetch = vi.fn();
    useRecruiterJobs.mockReturnValue(
      queryState({
        data: undefined,
        error: {
          isAxiosError: true,
          response: {
            status: 503,
            data: { error: "Recruiter jobs are temporarily unavailable." },
          },
        },
        isError: true,
        refetch,
      }),
    );
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Recruiter jobs are temporarily unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("shows the empty state and a working create-job destination", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "No jobs yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create your first posting to start building a candidate pipeline.",
      ),
    ).toBeInTheDocument();
    for (const createJobLink of screen.getAllByRole("link", {
      name: "Create job",
    })) {
      expect(createJobLink).toHaveAttribute(
        "href",
        "/recruiter/jobs/create",
      );
    }
  });

  it("renders real job data with UUID-based pipeline, detail, and edit links", () => {
    useRecruiterJobs.mockReturnValue(queryState({ data: [recruiterJob] }));

    renderPage();

    expect(
      screen.getByRole("heading", { name: recruiterJob.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(recruiterJob.description)).toBeInTheDocument();
    expect(screen.getByText("Location not specified")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View pipeline" }),
    ).toHaveAttribute(
      "href",
      `/recruiter/pipeline/${recruiterJob.id}`,
    );
    expect(
      screen.getByRole("link", { name: "View details" }),
    ).toHaveAttribute("href", `/recruiter/jobs/${recruiterJob.id}`);
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/recruiter/jobs/${recruiterJob.id}/edit`,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("applicants")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  // CareersPageLink moved off this page onto RecruiterCreateCompanyPage —
  // see RecruiterCreateCompanyPage.test.tsx for its coverage now. This page
  // no longer touches the company profile at all.
});
