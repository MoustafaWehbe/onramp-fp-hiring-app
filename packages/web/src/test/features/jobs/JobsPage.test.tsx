import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsPage } from "@/pages/jobs/JobsPage";
import type { PublicJobRecord } from "@/types/jobs";

const { usePublicJobs, useAuth } = vi.hoisted(() => ({
  usePublicJobs: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  usePublicJobs,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));

// The recommendations panel is candidate-only and has its own tests; these
// cases cover the public job list.
vi.mock("@/features/candidate/components/RecommendedJobs", () => ({
  RecommendedJobs: () => null,
}));

const reactJob: PublicJobRecord = {
  id: "job-react",
  title: "Product Engineer",
  description: "Build customer-facing product experiences.",
  location: "Remote",
  status: "OPEN",
  createdAt: "2026-07-25T09:00:00.000Z",
  employmentType: "FULL_TIME",
  experienceMin: 2,
  experienceMax: 5,
  isRemote: true,
  salaryMin: 80_000,
  salaryMax: 110_000,
  salaryCurrency: "USD",
  company: {
    id: "company-northstar",
    name: "Northstar Labs",
    website: "https://northstar.example",
    logoUrl: null,
  },
  skills: [
    { id: "skill-react", name: "React" },
    { id: "skill-typescript", name: "TypeScript" },
  ],
};

const pythonJob: PublicJobRecord = {
  id: "job-python",
  title: "Backend Engineer",
  description: "Build reliable platform services.",
  location: null,
  status: "OPEN",
  createdAt: "2026-07-24T09:00:00.000Z",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 7,
  isRemote: false,
  salaryMin: 85_000,
  salaryMax: 125_000,
  salaryCurrency: "USD",
  company: {
    id: "company-cedar",
    name: "Cedar Systems",
    website: null,
    logoUrl: null,
  },
  skills: [{ id: "skill-python", name: "Python" }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <JobsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null, currentRole: null });
});

describe("JobsPage", () => {
  it("shows loading placeholders while public jobs are loading", () => {
    usePublicJobs.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByLabelText("Loading jobs")).toBeInTheDocument();
    expect(screen.getByText("Finding open roles...")).toBeInTheDocument();
    expect(screen.queryByText("Product Engineer")).not.toBeInTheDocument();
  });

  it("shows the API error and retries the query", async () => {
    const refetch = vi.fn();
    usePublicJobs.mockReturnValue({
      data: undefined,
      error: {
        isAxiosError: true,
        response: {
          data: { error: "Public jobs are temporarily unavailable." },
        },
      },
      isLoading: false,
      isError: true,
      refetch,
    });

    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Public jobs are temporarily unavailable.",
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renders API jobs and filters them by the derived skill options", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("2 open roles")).toBeInTheDocument();
    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Remote available")).toBeInTheDocument();
    expect(screen.getByText("2–5 years")).toBeInTheDocument();
    expect(screen.getByText("$80,000 – $110,000")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "TypeScript" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "React" }));

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("Matching the React stack.")).toBeInTheDocument();
  });

  it("routes each card's company name to that company's careers page", () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("link", {
        name: "View all open roles at Northstar Labs",
      }),
    ).toHaveAttribute("href", "/careers/company-northstar");
  });

  it("shows the empty state when the API has no open jobs", () => {
    usePublicJobs.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("No open roles right now")).toBeInTheDocument();
    expect(
      screen.getByText("Check back soon for new opportunities."),
    ).toBeInTheDocument();
  });
});
