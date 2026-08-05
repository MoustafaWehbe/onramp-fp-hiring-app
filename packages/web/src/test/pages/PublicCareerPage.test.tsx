import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicCareerPage } from "@/pages/PublicCareerPage";

const { useCompanyCareersPage } = vi.hoisted(() => ({
  useCompanyCareersPage: vi.fn(),
}));

vi.mock("@/features/company/hooks", () => ({
  useCompanyCareersPage: (companyId: string | undefined) =>
    useCompanyCareersPage(companyId),
}));

const company = {
  id: "company-1",
  name: "Northwind Labs",
  website: "https://northwind.example",
  logoUrl: "https://northwind.example/logo.png",
  description: "We build tooling for hiring teams.",
};

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    title: "Senior Platform Engineer",
    description: "Build a dependable developer platform.",
    location: "Remote",
    status: "OPEN",
    createdAt: "2026-07-01T00:00:00.000Z",
    employmentType: "FULL_TIME",
    experienceMin: 4,
    experienceMax: 8,
    isRemote: true,
    salaryMin: 100_000,
    salaryMax: 140_000,
    salaryCurrency: "USD",
    company,
    skills: [{ id: "skill-1", name: "TypeScript" }],
    ...overrides,
  };
}

function mockQuery(overrides: Record<string, unknown>) {
  useCompanyCareersPage.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/careers/company-1"]}>
      <Routes>
        <Route path="/careers/:companyId" element={<PublicCareerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function axiosError(status: number) {
  return { isAxiosError: true, response: { status, data: {} } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicCareerPage", () => {
  it("shows the company's branding and its open roles", () => {
    mockQuery({ data: { company, jobs: [job()] } });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Careers at Northwind Labs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("We build tooling for hiring teams."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Senior Platform Engineer" }),
    ).toHaveAttribute("href", "/jobs/job-1");
  });

  it("renders the logo, which the first version fetched but never displayed", () => {
    mockQuery({ data: { company, jobs: [] } });

    renderPage();

    expect(screen.getByAltText("Northwind Labs logo")).toHaveAttribute(
      "src",
      "https://northwind.example/logo.png",
    );
  });

  it("falls back to an initial when no logo is set", () => {
    mockQuery({
      data: { company: { ...company, logoUrl: null }, jobs: [] },
    });

    renderPage();

    expect(screen.queryByAltText(/logo/)).not.toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });

  it("offers a way back to the whole job board", async () => {
    mockQuery({ data: { company, jobs: [job()] } });

    renderPage();

    const backLinks = await screen.findAllByRole("link", {
      name: "Back to all jobs",
    });
    expect(backLinks[0]).toHaveAttribute("href", "/jobs");
  });

  it("explains an empty board instead of rendering a bare heading", () => {
    mockQuery({ data: { company, jobs: [] } });

    renderPage();

    expect(screen.getByText("No open roles right now")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse all jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("treats an unknown company as not found, with no retry offered", () => {
    mockQuery({ isError: true, error: axiosError(404) });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Company not found" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry on a real failure", async () => {
    const refetch = vi.fn();
    mockQuery({ isError: true, error: axiosError(500), refetch });

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("does not link a job card back to the page it is already on", () => {
    mockQuery({ data: { company, jobs: [job()] } });

    renderPage();

    expect(
      screen.queryByRole("link", {
        name: "View all open roles at Northwind Labs",
      }),
    ).not.toBeInTheDocument();
  });
});
