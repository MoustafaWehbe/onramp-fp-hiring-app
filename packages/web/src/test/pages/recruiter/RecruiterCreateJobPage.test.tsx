import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterCreateJobPage } from "@/pages/recruiter/RecruiterCreateJobPage";

const {
  useCompanyProfile,
  useCreateRecruiterJob,
  mutateAsync,
  searchSkills,
  createSkill,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  useCompanyProfile: vi.fn(),
  useCreateRecruiterJob: vi.fn(),
  mutateAsync: vi.fn(),
  searchSkills: vi.fn(),
  createSkill: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/features/skills/api", () => ({
  searchSkills,
  createSkill,
}));

vi.mock("@/features/company/hooks", () => ({
  useCompanyProfile,
}));

vi.mock("@/features/jobs/hooks", () => ({
  useCreateRecruiterJob,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

const completeCompany = {
  id: "company-1",
  name: "Northstar Labs",
  industry: "Developer tools",
  size: "11–50 employees",
  location: "Beirut, Lebanon",
  contact: "talent@northstar.example",
  website: null,
  description: null,
  logoUrl: null,
  profileComplete: true,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/recruiter/jobs/create"]}>
      <Routes>
        <Route
          path="/recruiter/jobs/create"
          element={<RecruiterCreateJobPage />}
        />
        <Route path="/recruiter/jobs" element={<p>Recruiter jobs destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useCompanyProfile.mockReturnValue({
    data: completeCompany,
    error: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  useCreateRecruiterJob.mockReturnValue({
    mutateAsync,
    isPending: false,
  });
  mutateAsync.mockResolvedValue({ id: "job-1" });
  searchSkills.mockResolvedValue([]);
  createSkill.mockResolvedValue({ id: "skill-typescript", name: "TypeScript" });
});

describe("RecruiterCreateJobPage", () => {
  it("gates the job form when no company profile exists", () => {
    useCompanyProfile.mockReturnValue({
      data: undefined,
      error: {
        isAxiosError: true,
        response: { status: 404, data: { error: "Company not found" } },
      },
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("heading", {
        name: "Complete your company profile first",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set up company profile" }),
    ).toHaveAttribute("href", "/recruiter/company/create");
    expect(screen.queryByLabelText("Job title")).not.toBeInTheDocument();
  });

  it("gates the form when the existing company profile is incomplete", () => {
    useCompanyProfile.mockReturnValue({
      data: { ...completeCompany, contact: "", profileComplete: false },
      error: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("link", { name: "Set up company profile" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Job title")).not.toBeInTheDocument();
  });

  it("submits the complete structured job and returns to recruiter jobs", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Job title"), "Platform Engineer");
    await user.type(screen.getByLabelText("Location"), "Beirut, Lebanon");
    await user.clear(screen.getByLabelText("Minimum salary"));
    await user.type(screen.getByLabelText("Minimum salary"), "80000");
    await user.clear(screen.getByLabelText("Maximum salary"));
    await user.type(screen.getByLabelText("Maximum salary"), "120000");
    await user.type(screen.getByLabelText("Required skill"), "TypeScript");
    await user.click(
      await screen.findByRole("option", {
        name: 'Add "TypeScript" as a new skill',
      }),
    );
    await user.type(
      screen.getByLabelText("Description"),
      "Build reliable hiring workflows.",
    );
    await user.selectOptions(
      screen.getByLabelText("Publishing status"),
      "OPEN",
    );
    await user.click(screen.getByRole("button", { name: "Create job" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        title: "Platform Engineer",
        description: "Build reliable hiring workflows.",
        employmentType: "FULL_TIME",
        experienceMin: 0,
        experienceMax: 3,
        location: "Beirut, Lebanon",
        isRemote: false,
        salaryMin: 80_000,
        salaryMax: 120_000,
        salaryCurrency: "USD",
        skills: ["TypeScript"],
        status: "OPEN",
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Job published");
    expect(
      await screen.findByText("Recruiter jobs destination"),
    ).toBeInTheDocument();
  });
});
