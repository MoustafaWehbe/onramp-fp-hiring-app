import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterCreateCompanyPage } from "@/pages/recruiter/RecruiterCreateCompanyPage";

const {
  useCompanyProfile,
  useCreateCompanyProfile,
  useUpdateCompanyProfile,
  createMutateAsync,
  updateMutateAsync,
  toastSuccess,
} = vi.hoisted(() => ({
  useCompanyProfile: vi.fn(),
  useCreateCompanyProfile: vi.fn(),
  useUpdateCompanyProfile: vi.fn(),
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/features/company/hooks", () => ({
  useCompanyProfile,
  useCreateCompanyProfile,
  useUpdateCompanyProfile,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/recruiter/company/create"]}>
      <Routes>
        <Route
          path="/recruiter/company/create"
          element={<RecruiterCreateCompanyPage />}
        />
        <Route
          path="/recruiter/jobs/create"
          element={<p>Create job destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
  useCreateCompanyProfile.mockReturnValue({
    mutateAsync: createMutateAsync,
    isPending: false,
  });
  useUpdateCompanyProfile.mockReturnValue({
    mutateAsync: updateMutateAsync,
    isPending: false,
  });
  createMutateAsync.mockResolvedValue({ id: "company-1" });
});

describe("RecruiterCreateCompanyPage", () => {
  it("creates a complete company profile before continuing to job setup", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Company name"), "Northstar Labs");
    await user.type(screen.getByLabelText("Industry"), "Developer tools");
    await user.type(screen.getByLabelText("Company size"), "11–50 employees");
    await user.type(screen.getByLabelText("Location"), "Beirut, Lebanon");
    await user.type(
      screen.getByLabelText("Hiring contact"),
      "talent@northstar.example",
    );
    await user.click(
      screen.getByRole("button", { name: "Create and continue" }),
    );

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: "Northstar Labs",
        industry: "Developer tools",
        size: "11–50 employees",
        location: "Beirut, Lebanon",
        contact: "talent@northstar.example",
        website: undefined,
        description: undefined,
        logoUrl: undefined,
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Company profile created");
    expect(await screen.findByText("Create job destination")).toBeInTheDocument();
  });
});
