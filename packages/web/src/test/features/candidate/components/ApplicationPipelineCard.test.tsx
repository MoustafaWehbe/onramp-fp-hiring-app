import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationPipelineCard } from "@/features/candidate/components/ApplicationPipelineCard";
import type { CandidateApplication } from "@/types/applications";

const { useMyApplications, useIsMdUp } = vi.hoisted(() => ({
  useMyApplications: vi.fn(),
  useIsMdUp: vi.fn(),
}));

vi.mock("@/features/applications/hooks", () => ({
  useMyApplications: (enabled?: boolean) => useMyApplications(enabled),
}));
vi.mock("@/hooks/useIsMdUp", () => ({ useIsMdUp: () => useIsMdUp() }));

function application(
  overrides: Partial<CandidateApplication> = {},
): CandidateApplication {
  return {
    id: "application-1",
    jobId: "job-1",
    stage: "INTERVIEWING",
    coverLetter: null,
    resumeUrl: null,
    submittedAt: "2026-07-20T09:00:00.000Z",
    createdAt: "2026-07-20T09:00:00.000Z",
    updatedAt: "2026-07-24T15:00:00.000Z",
    job: {
      id: "job-1",
      title: "Senior Product Engineer",
      description: "Build the core product.",
      location: "Remote",
      status: "OPEN",
      createdAt: "2026-07-01T00:00:00.000Z",
      company: {
        id: "company-1",
        name: "Northwind Labs",
        website: null,
        logoUrl: null,
      },
    },
    ...overrides,
  };
}

function mockApplications(data: CandidateApplication[] | undefined, extra = {}) {
  useMyApplications.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
    ...extra,
  });
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ApplicationPipelineCard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useIsMdUp.mockReturnValue(true);
});

describe("ApplicationPipelineCard", () => {
  it("renders nothing at all below the md breakpoint, without calling the applications query", () => {
    useIsMdUp.mockReturnValue(false);
    mockApplications([application()]);

    const { container } = renderCard();

    expect(container).toBeEmptyDOMElement();
    // The hook is still called (rules of hooks), but disabled — no fetch.
    expect(useMyApplications).toHaveBeenCalledWith(false);
  });

  it("passes the md-up flag through as the query's enabled flag", () => {
    useIsMdUp.mockReturnValue(true);
    mockApplications([application()]);

    renderCard();

    expect(useMyApplications).toHaveBeenCalledWith(true);
  });

  it("shows the section heading, the picker, and the selected application's current stage", () => {
    mockApplications([application()]);

    renderCard();

    expect(screen.getByText("Application Pipeline")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /choose an application/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "Senior Product Engineer · Northwind Labs",
      }),
    ).toBeInTheDocument();

    // INTERVIEWING is the 3rd forward stage — completed stages (Applied,
    // Reviewed) plus the current one all render as labels.
    expect(screen.getByText("Applied")).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("Interviewing")).toBeInTheDocument();
    expect(screen.getByText("Current stage")).toBeInTheDocument();
    expect(screen.getByText("Offer")).toBeInTheDocument();
    expect(screen.getByText("Hired")).toBeInTheDocument();
  });

  it("switches the pipeline to match the newly selected application", async () => {
    const user = userEvent.setup();
    mockApplications([
      application(),
      application({
        id: "application-2",
        jobId: "job-2",
        stage: "HIRED",
        job: {
          id: "job-2",
          title: "Platform Engineer",
          description: "Own the platform.",
          location: "Remote",
          status: "OPEN",
          createdAt: "2026-06-01T00:00:00.000Z",
          company: {
            id: "company-2",
            name: "Acme Co",
            website: null,
            logoUrl: null,
          },
        },
      }),
    ]);

    renderCard();

    const picker = screen.getByRole("combobox", {
      name: /choose an application/i,
    });
    await user.selectOptions(picker, "application-2");

    // HIRED is the current (and final) stage for the second application.
    expect(screen.getByText("Current stage")).toBeInTheDocument();
    expect(picker).toHaveValue("application-2");
  });

  it("marks only Applied as complete and explains the outcome for a rejected application", () => {
    mockApplications([application({ stage: "REJECTED" })]);

    renderCard();

    expect(
      screen.getByText(/not moving forward on this one/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Current stage")).not.toBeInTheDocument();
  });

  it("excludes draft applications from the picker and treats an all-draft list as empty", () => {
    mockApplications([application({ id: "draft-1", stage: "DRAFT" })]);

    renderCard();

    expect(
      screen.getByText("Apply to jobs to track your pipeline here."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse jobs" }),
    ).toHaveAttribute("href", "/jobs");
  });

  it("shows a friendly prompt instead of an error when the candidate has no profile yet", () => {
    mockApplications(undefined, {
      isError: true,
      error: { isAxiosError: true, response: { status: 404 } },
    });

    renderCard();

    expect(
      screen.getByText(/complete your candidate profile above/i),
    ).toBeInTheDocument();
  });

  it("shows a retry control for a real error", () => {
    mockApplications(undefined, {
      isError: true,
      error: { isAxiosError: true, response: { status: 500 } },
    });

    renderCard();

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });
});
