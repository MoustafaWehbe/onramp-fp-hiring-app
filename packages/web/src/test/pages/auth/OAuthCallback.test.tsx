import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuthCallback } from "@/pages/auth/OAuthCallback";
import type { AuthUser } from "@/types/users";

const { useAuth, setIntendedRole } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  setIntendedRole: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));

const returningUser: AuthUser = {
  id: "user-1",
  email: "person@example.com",
  name: "Person",
  role: "RECRUITER",
  roleSelectionPending: false,
};

function mockAuth(overrides: Record<string, unknown> = {}) {
  useAuth.mockReturnValue({
    user: returningUser,
    currentRole: "recruiter",
    intendedRole: null,
    isLoading: false,
    needsRoleSelection: false,
    setIntendedRole,
    ...overrides,
  });
}

function LoginProbe() {
  const location = useLocation();
  return <p>Login page{location.search}</p>;
}

function renderCallback(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/auth/select-role" element={<p>Role prompt</p>} />
        <Route path="/recruiter/dashboard" element={<p>Recruiter dashboard</p>} />
        <Route path="/recruiter/jobs" element={<p>Recruiter jobs</p>} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth();
});

describe("OAuthCallback", () => {
  it("waits rather than deciding while the session is still being read", () => {
    mockAuth({ isLoading: true, user: null });

    renderCallback();

    expect(screen.getByText(/finishing sign-in/i)).toBeInTheDocument();
  });

  it("sends a returning user straight to their workspace", () => {
    renderCallback("?provider=google");

    expect(screen.getByText("Recruiter dashboard")).toBeInTheDocument();
  });

  it("honours the destination the visitor was headed for", () => {
    renderCallback("?provider=google&returnTo=%2Frecruiter%2Fjobs");

    expect(screen.getByText("Recruiter jobs")).toBeInTheDocument();
  });

  it("sends a first-time signup to the role prompt", () => {
    mockAuth({
      user: { ...returningUser, role: "CANDIDATE", roleSelectionPending: true },
      needsRoleSelection: true,
    });

    renderCallback("?provider=google&status=new");

    expect(screen.getByText("Role prompt")).toBeInTheDocument();
  });

  it("decides from the session, not from a status the URL claims", () => {
    // status=new is attacker-supplied; the fetched user says otherwise and wins.
    renderCallback("?provider=google&status=new");

    expect(screen.getByText("Recruiter dashboard")).toBeInTheDocument();
  });

  it("carries the pre-signin role choice into the prompt", () => {
    mockAuth({
      user: { ...returningUser, role: "CANDIDATE", roleSelectionPending: true },
      needsRoleSelection: true,
    });

    renderCallback("?provider=google&status=new&role=RECRUITER");

    expect(setIntendedRole).toHaveBeenCalledWith("recruiter");
  });

  it("falls back to login when the session did not survive the round-trip", () => {
    mockAuth({ user: null, currentRole: null });

    renderCallback("?provider=google");

    expect(
      screen.getByText("Login page?oauth_error=provider_error"),
    ).toBeInTheDocument();
  });
});
