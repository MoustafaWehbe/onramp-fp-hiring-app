import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "@/pages/auth/Login";

const { useAuth, apiGet } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get: apiGet } }));

function renderLogin(search = "") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/login${search}`]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    login: vi.fn(),
    intendedRole: null,
    setIntendedRole: vi.fn(),
  });
  apiGet.mockResolvedValue({ data: { data: { providers: ["google"] } } });
});

describe("Login page — provider sign-in", () => {
  it("offers provider sign-in before the password form", async () => {
    renderLogin();

    const providerButton = await screen.findByRole("button", {
      name: /continue with google/i,
    });
    const passwordInput = screen.getByLabelText(/password/i);

    expect(providerButton).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(
      providerButton.compareDocumentPosition(passwordInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("explains an email collision and leaves the password form right there", async () => {
    renderLogin("?oauth_error=email_exists&provider=google");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/an account with this email already exists/i);
    expect(alert).toHaveTextContent(/log in with your password/i);
    // The path back is the form itself — it must still be usable.
    expect(screen.getByLabelText(/^email$/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled();
  });

  it("treats a cancelled consent as a choice, not an error", async () => {
    renderLogin("?oauth_error=access_denied&provider=google");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/cancelled/i);
    expect(alert.textContent).not.toMatch(/error|failed/i);
  });

  it("says so plainly when the provider is not set up on this server", async () => {
    renderLogin("?oauth_error=provider_not_configured&provider=github");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /github sign-in isn't set up/i,
    );
  });

  it("shows no banner on a normal visit", () => {
    renderLogin();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
