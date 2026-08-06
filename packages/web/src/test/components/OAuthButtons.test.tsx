import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import type { PlatformRole } from "@/types/users";

const { apiGet, startOAuth } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  startOAuth: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet },
}));

vi.mock("@/lib/oauth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/oauth")>()),
  startOAuth,
}));

function renderButtons(role: PlatformRole | null = null, returnTo?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OAuthButtons role={role} returnTo={returnTo} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockResolvedValue({ data: { data: { providers: ["google"] } } });
});

describe("OAuthButtons", () => {
  it("renders a button for each provider the server has configured", async () => {
    renderButtons();

    expect(
      await screen.findByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    // GitHub has no credentials on this deployment, so offering it would only
    // bounce the user back to an error.
    expect(
      screen.queryByRole("button", { name: /continue with github/i }),
    ).not.toBeInTheDocument();
  });

  it("renders both once the server reports both", async () => {
    apiGet.mockResolvedValue({
      data: { data: { providers: ["google", "github"] } },
    });

    renderButtons();

    expect(
      await screen.findByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with github/i }),
    ).toBeInTheDocument();
  });

  it("renders nothing when the server has no provider configured", async () => {
    apiGet.mockResolvedValue({ data: { data: { providers: [] } } });

    renderButtons();

    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back to the known providers if the lookup itself fails", async () => {
    apiGet.mockRejectedValue(new Error("network down"));

    renderButtons();

    // Better a button that explains itself on the way back than a sign-in
    // path that silently disappears because one request failed.
    expect(
      await screen.findByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("starts the flow with the role and destination the visitor came in with", async () => {
    const user = userEvent.setup();
    renderButtons("recruiter", "/recruiter/jobs");

    await user.click(
      await screen.findByRole("button", { name: /continue with google/i }),
    );

    expect(startOAuth).toHaveBeenCalledWith("google", {
      role: "recruiter",
      returnTo: "/recruiter/jobs",
    });
  });
});
