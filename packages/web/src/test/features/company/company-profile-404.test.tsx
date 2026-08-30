import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RecruiterCreateCompanyPage } from "@/pages/recruiter/RecruiterCreateCompanyPage";

/**
 * Exercises the real useCompanyProfile hook (only the underlying api.ts
 * network call is stubbed) rather than mocking the hook itself, the way
 * RecruiterCreateCompanyPage.test.tsx does — that file's hook-level mock
 * can't observe this bug, since the bug lived in how two independent
 * useCompanyProfile() observers (one in the page, one in the
 * child CareersPageLink it used to render) interacted with each other.
 */
const { getCompanyProfile } = vi.hoisted(() => ({
  getCompanyProfile: vi.fn(),
}));

vi.mock("@/features/company/api", () => ({ getCompanyProfile }));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/recruiter/company/create"]}>
        <RecruiterCreateCompanyPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RecruiterCreateCompanyPage against a real 404 from GET /companies/me", () => {
  it("renders the create-company form instead of polling the skeleton forever", async () => {
    getCompanyProfile.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { error: "Company not found" } },
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.queryByLabelText("Loading company profile"),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: "Tell us about your company" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create and continue" }),
    ).toBeInTheDocument();

    // The regression itself: a mishandled 404 kept remounting a child
    // component that re-queried the same endpoint, refetching it forever.
    // Give any such loop a moment to run, then confirm it didn't.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(getCompanyProfile).toHaveBeenCalledTimes(1);
  });
});
