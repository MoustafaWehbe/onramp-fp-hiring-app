import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SelectRolePage } from "@/pages/auth/SelectRolePage";
import type { AuthUser } from "@/types/users";

const { useAuth, selectRole } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  selectRole: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth }));

const pendingUser: AuthUser = {
  id: "user-1",
  email: "new.person@example.com",
  name: "New Person",
  role: "CANDIDATE",
  roleSelectionPending: true,
};

function mockAuth(overrides: Record<string, unknown> = {}) {
  useAuth.mockReturnValue({
    user: pendingUser,
    currentRole: "candidate",
    intendedRole: null,
    isLoading: false,
    needsRoleSelection: true,
    setIntendedRole: vi.fn(),
    selectRole,
    ...overrides,
  });
}

function renderPage(initialEntry: unknown = "/auth/select-role") {
  return render(
    <MemoryRouter initialEntries={[initialEntry as string]}>
      <Routes>
        <Route path="/auth/select-role" element={<SelectRolePage />} />
        <Route path="/recruiter/dashboard" element={<p>Recruiter dashboard</p>} />
        <Route path="/candidate" element={<p>Candidate home</p>} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/recruiter/jobs" element={<p>Recruiter jobs</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth();
});

describe("SelectRolePage", () => {
  it("asks the new OAuth user which side of hiring they are on", () => {
    renderPage();

    expect(screen.getByText(/hiring, or looking for work/i)).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: /choose your workspace role/i }),
    ).toBeInTheDocument();
  });

  it("sends a new recruiter to the same dashboard a password recruiter lands on, where the company-profile gate picks them up", async () => {
    const user = userEvent.setup();
    selectRole.mockResolvedValue({ ...pendingUser, role: "RECRUITER" });

    renderPage();

    await user.click(screen.getByRole("radio", { name: /recruiter/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(selectRole).toHaveBeenCalledWith("recruiter");
    expect(await screen.findByText("Recruiter dashboard")).toBeInTheDocument();
  });

  it("sends a new candidate to the candidate workspace", async () => {
    const user = userEvent.setup();
    selectRole.mockResolvedValue({ ...pendingUser, role: "CANDIDATE" });

    renderPage();

    await user.click(screen.getByRole("radio", { name: /^candidate/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Candidate home")).toBeInTheDocument();
  });

  it("refuses to submit without an answer", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(selectRole).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /choose how you'll use hireflow/i,
    );
  });

  it("opens on the role the visitor had already picked before signing in", () => {
    mockAuth({ intendedRole: "recruiter" });
    renderPage();

    expect(screen.getByRole("radio", { name: /recruiter/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("returns the user to where they were headed when there was one", async () => {
    const user = userEvent.setup();
    selectRole.mockResolvedValue({ ...pendingUser, role: "RECRUITER" });

    render(
      <MemoryRouter
        initialEntries={[
          { pathname: "/auth/select-role", state: { returnTo: "/recruiter/jobs" } },
        ]}
      >
        <Routes>
          <Route path="/auth/select-role" element={<SelectRolePage />} />
          <Route path="/recruiter/jobs" element={<p>Recruiter jobs</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("radio", { name: /recruiter/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Recruiter jobs")).toBeInTheDocument();
  });

  it("is not reachable once the account already has a role", () => {
    mockAuth({
      user: { ...pendingUser, role: "RECRUITER", roleSelectionPending: false },
      needsRoleSelection: false,
    });

    renderPage();

    expect(screen.getByText("Recruiter dashboard")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to login", () => {
    mockAuth({ user: null, needsRoleSelection: false });

    renderPage();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("explains a failure instead of leaving the button spinning", async () => {
    const user = userEvent.setup();
    selectRole.mockRejectedValue(new Error("boom"));

    renderPage();

    await user.click(screen.getByRole("radio", { name: /^candidate/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /couldn't save that choice/i,
      ),
    );
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeEnabled();
  });
});
