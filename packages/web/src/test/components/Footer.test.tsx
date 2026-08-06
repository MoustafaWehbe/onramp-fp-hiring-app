import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Footer } from "@/components/layout/Footer";

const useAuth = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuth(),
}));

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only exposes public links to signed-out visitors", () => {
    useAuth.mockReturnValue({ currentRole: null });

    renderFooter();

    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
    expect(
      screen.queryByRole("link", { name: "Applications" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Profile" }),
    ).not.toBeInTheDocument();
  });

  it("uses recruiter navigation without candidate-only links", () => {
    useAuth.mockReturnValue({ currentRole: "recruiter" });

    renderFooter();

    expect(screen.getByRole("link", { name: "Pipeline" })).toHaveAttribute(
      "href",
      "/recruiter/pipeline",
    );
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/recruiter/jobs",
    );
    expect(screen.getByRole("link", { name: "Talent pool" })).toHaveAttribute(
      "href",
      "/recruiter/candidates",
    );
    expect(screen.getByRole("link", { name: "Company" })).toHaveAttribute(
      "href",
      "/recruiter/company/create",
    );
    expect(
      screen.queryByRole("link", { name: "Applications" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Profile" }),
    ).not.toBeInTheDocument();
  });

  it("uses interviewer assignment links", () => {
    useAuth.mockReturnValue({ currentRole: "interviewer" });

    renderFooter();

    expect(screen.getByRole("link", { name: "Assignments" })).toHaveAttribute(
      "href",
      "/interviewer/pipeline",
    );
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute(
      "href",
      "/interviewer/schedule",
    );
    expect(
      screen.queryByRole("link", { name: "Applications" }),
    ).not.toBeInTheDocument();
  });
});
