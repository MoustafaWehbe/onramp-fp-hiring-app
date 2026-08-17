import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterUpgradePage } from "@/pages/recruiter/RecruiterUpgradePage";

const { useCompanyProfile, useUpdateCompanySubscription, mutate, toastSuccess, toastError } =
  vi.hoisted(() => ({
    useCompanyProfile: vi.fn(),
    useUpdateCompanySubscription: vi.fn(),
    mutate: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }));

vi.mock("@/features/company/hooks", () => ({
  useCompanyProfile,
  useUpdateCompanySubscription,
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const freeCompany = {
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
  subscriptionTier: "FREE" as const,
  subscriptionStartedAt: null,
  subscriptionUpdatedAt: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RecruiterUpgradePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useCompanyProfile.mockReturnValue({
    data: freeCompany,
    error: null,
    isLoading: false,
    isError: false,
  });
  useUpdateCompanySubscription.mockReturnValue({
    mutate,
    isPending: false,
  });
});

describe("RecruiterUpgradePage", () => {
  it("marks the Free card as the current plan and enables the Pro upgrade CTA", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "Current plan" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Upgrade to Pro" }),
    ).toBeEnabled();
  });

  it("upgrades to Pro on click and shows an instant-unlock confirmation", async () => {
    mutate.mockImplementation((_variables, options) => {
      options.onSuccess();
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(mutate).toHaveBeenCalledWith(
      { id: "company-1", tier: "PRO" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("no need to sign in again"),
    );
  });

  it("marks the Pro card as current and lets a Pro company move back to Free", async () => {
    useCompanyProfile.mockReturnValue({
      data: { ...freeCompany, subscriptionTier: "PRO" },
      error: null,
      isLoading: false,
      isError: false,
    });
    mutate.mockImplementation((_variables, options) => {
      options.onSuccess();
    });
    const user = userEvent.setup();

    renderPage();

    const proButtons = screen.getAllByRole("button", { name: "Current plan" });
    expect(proButtons).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Move to Free" }));

    expect(mutate).toHaveBeenCalledWith(
      { id: "company-1", tier: "FREE" },
      expect.anything(),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Moved back to the Free plan.");
  });

  it("shows an error toast when the update fails", async () => {
    mutate.mockImplementation((_variables, options) => {
      options.onError({
        isAxiosError: true,
        response: { data: { error: "Something went wrong." } },
      });
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole("button", { name: "Upgrade to Pro" }));

    expect(toastError).toHaveBeenCalledWith("Something went wrong.");
  });
});
