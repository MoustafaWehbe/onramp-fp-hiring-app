import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsPage } from "@/pages/applications/ApplicationsPage";

const useMyApplications = vi.fn();

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: () => useMyApplications(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ApplicationsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ApplicationsPage", () => {
  it("shows loading placeholders while applications are loading", () => {
    useMyApplications.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByLabelText("Loading applications")).toBeInTheDocument();
  });

  it("renders the candidate's applications and derived summary", () => {
    useMyApplications.mockReturnValue({
      data: [
        {
          id: "application-1",
          jobId: "job-1",
          stage: "INTERVIEWING",
          coverLetter: null,
          resumeUrl: null,
          submittedAt: "2026-07-20T09:00:00.000Z",
          createdAt: "2026-07-20T09:00:00.000Z",
          updatedAt: "2026-07-22T11:00:00.000Z",
          job: {
            id: "job-1",
            title: "Senior Platform Engineer",
            description: "Build a dependable developer platform.",
            location: "Remote",
            status: "OPEN",
            createdAt: "2026-07-01T00:00:00.000Z",
            company: {
              id: "company-1",
              name: "Northstar Labs",
              website: null,
              logoUrl: null,
            },
          },
        },
        {
          id: "application-2",
          jobId: "job-2",
          stage: "OFFER",
          coverLetter: null,
          resumeUrl: null,
          submittedAt: "2026-07-18T09:00:00.000Z",
          createdAt: "2026-07-18T09:00:00.000Z",
          updatedAt: "2026-07-24T11:00:00.000Z",
          job: {
            id: "job-2",
            title: "Product Engineer",
            description: "Ship thoughtful product experiences.",
            location: null,
            status: "OPEN",
            createdAt: "2026-07-02T00:00:00.000Z",
            company: {
              id: "company-2",
              name: "Acme Works",
              website: null,
              logoUrl: null,
            },
          },
        },
      ],
      isLoading: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Senior Platform Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Northstar Labs")).toBeInTheDocument();
    expect(screen.getByText("Interviewing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Product Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("Total applications").previousSibling).toHaveTextContent(
      "2",
    );
    expect(
      screen.getByText("Interviews in progress").previousSibling,
    ).toHaveTextContent("1");
    expect(screen.getByText("Offers and hires").previousSibling).toHaveTextContent(
      "1",
    );
  });

  it("shows an empty state that links back to open jobs", () => {
    useMyApplications.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "No applications yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });

  it("shows the API error and lets the candidate retry", async () => {
    const refetch = vi.fn();
    useMyApplications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      isFetching: false,
      error: {
        isAxiosError: true,
        response: {
          status: 500,
          data: { error: "Applications could not be loaded." },
        },
      },
      refetch,
    });

    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Applications could not be loaded.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
