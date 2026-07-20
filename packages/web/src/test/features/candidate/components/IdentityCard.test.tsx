import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentityCard } from "@/features/candidate/components/IdentityCard";

const useProfile = vi.fn();
const createProfileMutateAsync = vi.fn();
const updateProfileMutateAsync = vi.fn();

vi.mock("@/features/candidate/hooks", () => ({
  useProfile: () => useProfile(),
  useCreateProfile: () => ({
    mutateAsync: createProfileMutateAsync,
    isPending: false,
  }),
  useUpdateProfile: () => ({
    mutateAsync: updateProfileMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "amara.okafor@example.com", name: "Amara Okafor", role: "CANDIDATE" },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function fakeAxiosError(status: number) {
  return { isAxiosError: true, response: { status, data: {} } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IdentityCard", () => {
  it("shows a loading skeleton while the profile is loading", () => {
    useProfile.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    const { container } = render(<IdentityCard />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows the create-profile flow when the profile 404s", () => {
    useProfile.mockReturnValue({
      isLoading: false,
      isError: true,
      error: fakeAxiosError(404),
      data: undefined,
      refetch: vi.fn(),
    });

    render(<IdentityCard />);

    expect(
      screen.getByText(/set up your candidate profile to start applying/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create profile/i })).toBeInTheDocument();
  });

  it("submits the create-profile form", async () => {
    useProfile.mockReturnValue({
      isLoading: false,
      isError: true,
      error: fakeAxiosError(404),
      data: undefined,
      refetch: vi.fn(),
    });
    createProfileMutateAsync.mockResolvedValue({});

    const user = userEvent.setup();
    render(<IdentityCard />);

    await user.type(screen.getByLabelText(/headline/i), "Senior Engineer");
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    expect(createProfileMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ headline: "Senior Engineer" }),
    );
  });

  it("shows a non-404 error with a retry action", async () => {
    const refetch = vi.fn();
    useProfile.mockReturnValue({
      isLoading: false,
      isError: true,
      error: fakeAxiosError(500),
      data: undefined,
      refetch,
    });

    const user = userEvent.setup();
    render(<IdentityCard />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders profile data in view mode and opens the edit form", async () => {
    useProfile.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: "p1",
        userId: "u1",
        headline: "Senior Full-Stack Engineer",
        bio: "Nine years shipping web products.",
        phone: "+1-555-0101",
        location: "Lagos, Nigeria",
        resumeUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      refetch: vi.fn(),
    });

    const user = userEvent.setup();
    render(<IdentityCard />);

    expect(screen.getByText("Senior Full-Stack Engineer")).toBeInTheDocument();
    expect(screen.getByText("Lagos, Nigeria")).toBeInTheDocument();
    expect(screen.queryByLabelText(/headline/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByLabelText(/headline/i)).toHaveValue("Senior Full-Stack Engineer");
  });
});
