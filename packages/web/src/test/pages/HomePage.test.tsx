import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/pages/HomePage";
import type { PublicJobRecord } from "@/types/jobs";

const { usePublicJobs, useAuth, navigate, setIntendedRole } = vi.hoisted(() => ({
  usePublicJobs: vi.fn(),
  useAuth: vi.fn(),
  navigate: vi.fn(),
  setIntendedRole: vi.fn(),
}));

vi.mock("@/features/jobs/hooks", () => ({
  usePublicJobs,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => navigate };
});

const job: PublicJobRecord = {
  id: "job-1",
  title: "Platform Engineer",
  description: "Build dependable infrastructure.",
  location: "Remote",
  status: "OPEN",
  createdAt: "2026-07-20T10:00:00.000Z",
  employmentType: "FULL_TIME",
  experienceMin: 3,
  experienceMax: 6,
  isRemote: true,
  salaryMin: 90_000,
  salaryMax: 120_000,
  salaryCurrency: "USD",
  company: {
    id: "company-1",
    name: "Northwind Labs",
    website: null,
    logoUrl: null,
  },
  skills: [{ id: "skill-1", name: "TypeScript" }],
};

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    user: null,
    currentRole: null,
    intendedRole: null,
    setIntendedRole,
  });
  usePublicJobs.mockReturnValue({
    data: [job],
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("HomePage", () => {
  it("renders the hero headline and featured open roles", () => {
    renderHomePage();

    expect(
      screen.getByRole("heading", {
        name: /hire smarter\. apply faster\. interview with clarity\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to registration with their chosen role", async () => {
    const user = userEvent.setup();
    renderHomePage();

    const [candidateButton] = screen.getAllByRole("button", {
      name: /candidate/i,
    });
    await user.click(candidateButton);

    expect(setIntendedRole).toHaveBeenCalledWith("candidate");
    expect(navigate).toHaveBeenCalledWith("/register?role=candidate");
  });

  it("shows an empty state when there are no open roles", () => {
    usePublicJobs.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderHomePage();

    expect(
      screen.getByText(/there are no open roles right now/i),
    ).toBeInTheDocument();
  });
});
