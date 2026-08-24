import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobsPage } from "@/pages/jobs/JobsPage";
import type { PublicJobRecord } from "@/types/jobs";

const { usePublicJobs, useAuth, useSkills } = vi.hoisted(() => ({
  usePublicJobs: vi.fn(),
  useAuth: vi.fn(),
  useSkills: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  usePublicJobs,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));
vi.mock("@/features/candidate/hooks", () => ({
  useSkills: (enabled?: boolean) => useSkills(enabled),
}));

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
    logoUrl: "https://northstar.example/logo.png",
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

function LocationProbe() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

function renderPage(initialEntry = "/jobs") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <JobsPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null, currentRole: null });
  useSkills.mockReturnValue({
    data: undefined,
    isSuccess: false,
    isError: false,
  });
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
      screen.getByRole("option", { name: "TypeScript" }),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Skill"), "React");

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1 job" })).toBeInTheDocument();
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?skill=React",
    );
    expect(
      screen.getByRole("button", { name: "Remove Skill: React filter" }),
    ).toBeInTheDocument();
    expect(useSkills).toHaveBeenCalledWith(false);
    expect(
      screen.queryByLabelText(/You match .* required skills/),
    ).not.toBeInTheDocument();
  });

  it("restores filters from the URL and makes each active filter removable", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage("/jobs?q=Backend&employmentType=FULL_TIME");

    expect(screen.getByLabelText("Keyword")).toHaveValue("Backend");
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Product Engineer")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Remove Keyword: Backend filter",
      }),
    );

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?employmentType=FULL_TIME",
    );
  });

  it("shows a filter-specific empty state and clears back to all jobs", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Keyword"), "no-such-role");

    expect(screen.getByRole("heading", { name: "0 jobs" })).toBeInTheDocument();
    expect(screen.getByText("No jobs match these filters")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Clear all filters" }),
    );

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByTestId("location-search")).toBeEmptyDOMElement();
  });

  it("shows compact skill-match counts only for a logged-in candidate", () => {
    useAuth.mockReturnValue({
      user: { id: "candidate-1", role: "CANDIDATE" },
      currentRole: "candidate",
    });
    useSkills.mockReturnValue({
      data: [{ id: "skill-react", name: "React" }],
      isSuccess: true,
      isError: false,
    });
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(useSkills).toHaveBeenCalledWith(true);
    expect(
      screen.getByLabelText("You match 1 of 2 required skills"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("You match 0 of 1 required skills"),
    ).toBeInTheDocument();
  });

  it("does not render cached skill matches while candidate skills refetch", () => {
    useAuth.mockReturnValue({
      user: { id: "candidate-1", role: "CANDIDATE" },
      currentRole: "candidate",
    });
    useSkills.mockReturnValue({
      data: [{ id: "skill-react", name: "React" }],
      isSuccess: true,
      isFetching: true,
      isError: false,
    });
    usePublicJobs.mockReturnValue({
      data: [reactJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.queryByLabelText(/You match .* required skills/),
    ).not.toBeInTheDocument();
  });

  it("requires a currency before comparing salary bounds in a mixed-currency feed", async () => {
    usePublicJobs.mockReturnValue({
      data: [
        reactJob,
        {
          ...pythonJob,
          salaryCurrency: "EUR",
        },
      ],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();

    expect(screen.getByLabelText("Minimum salary")).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Salary currency"), "USD");
    expect(screen.getByLabelText("Minimum salary")).toBeEnabled();
    await user.type(screen.getByLabelText("Minimum salary"), "105000");

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "currency=USD",
    );
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "salaryMin=105000",
    );
  });

  it("clears stale currency bounds instead of reinterpreting them", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage("/jobs?currency=EUR&salaryMin=120000");

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toBeEmptyDOMElement();
    });
    expect(screen.getByLabelText("Minimum salary")).toHaveValue(null);
  });

  it("removes a redundant sole currency while preserving valid bounds", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage("/jobs?currency=USD&salaryMin=115000");

    expect(screen.queryByText("Product Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "?salaryMin=115000",
      );
    });
    expect(screen.getByTestId("location-search")).not.toHaveTextContent(
      "currency=",
    );
  });

  it("clears mixed-currency salary bounds that have no currency", async () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, { ...pythonJob, salaryCurrency: "EUR" }],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage("/jobs?salaryMin=100000");

    expect(screen.getByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toBeEmptyDOMElement();
    });
    expect(screen.getByLabelText("Minimum salary")).toBeDisabled();
  });

  it("marks an inverted salary range invalid and matches no jobs", () => {
    usePublicJobs.mockReturnValue({
      data: [reactJob, pythonJob],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage("/jobs?salaryMin=120000&salaryMax=90000");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Minimum salary cannot be greater than maximum salary.",
    );
    expect(screen.getByLabelText("Minimum salary")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Maximum salary")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("heading", { name: "0 jobs" })).toBeInTheDocument();
    expect(screen.queryByText("Product Engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
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
    expect(screen.getByAltText("Northstar Labs logo")).toBeInTheDocument();
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
