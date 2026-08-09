import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScorecardPanel } from "@/features/scorecards/components/ScorecardPanel";
import type {
  ScorecardAggregate,
  ScorecardTemplateList,
} from "@/types/scorecards";

const {
  useScorecardTemplates,
  useApplicationScorecards,
  submitMutateAsync,
} = vi.hoisted(() => ({
  useScorecardTemplates: vi.fn(),
  useApplicationScorecards: vi.fn(),
  submitMutateAsync: vi.fn(),
}));

vi.mock("@/features/scorecards/hooks", () => ({
  useScorecardTemplates,
  useApplicationScorecards,
  useSubmitScorecard: () => ({
    mutateAsync: submitMutateAsync,
    isPending: false,
  }),
}));

const templateList: ScorecardTemplateList = {
  templates: [
    {
      id: "t1",
      title: "Engineering loop",
      createdAt: "2026-08-01T00:00:00.000Z",
      criteria: [
        {
          id: "c1",
          label: "Technical",
          description: "Depth in the craft",
          sortOrder: 0,
        },
        { id: "c2", label: "Communication", description: null, sortOrder: 1 },
      ],
    },
  ],
  starterCriteria: [],
};

const emptyAggregate: ScorecardAggregate = {
  scorecardCount: 0,
  overallAverage: null,
  criteriaAverages: [],
  scorecards: [],
};

function renderPanel() {
  return render(
    <MemoryRouter>
      <ScorecardPanel applicationId="app-1" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useScorecardTemplates.mockReturnValue({
    data: templateList,
    isLoading: false,
    isError: false,
  });
  useApplicationScorecards.mockReturnValue({
    data: emptyAggregate,
    isLoading: false,
    isError: false,
  });
});

describe("ScorecardPanel", () => {
  it("points a recruiter with no template at the place to make one", () => {
    useScorecardTemplates.mockReturnValue({
      data: { templates: [], starterCriteria: [] },
      isLoading: false,
      isError: false,
    });

    renderPanel();

    expect(screen.getByText(/no scorecard template yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /set up a scorecard template/i }),
    ).toHaveAttribute("href", "/recruiter/scorecard-templates");
    // No half-usable form with nothing to score.
    expect(
      screen.queryByRole("button", { name: /submit a scorecard/i }),
    ).not.toBeInTheDocument();
  });

  it("offers a fresh submission when the caller has not scored yet", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: /submit a scorecard/i }),
    );

    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
  });

  it("submits only the criteria that were actually scored", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: /submit a scorecard/i }),
    );

    // Score Technical only; Communication is deliberately left blank.
    const technical = screen.getByRole("radiogroup", {
      name: /technical rating/i,
    });
    await user.click(within(technical).getByRole("radio", { name: /^4 out of 5$/ }));

    await user.click(screen.getByRole("button", { name: /submit scorecard/i }));

    expect(submitMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "app-1",
        templateId: "t1",
        ratings: [
          expect.objectContaining({ criterionId: "c1", rating: 4 }),
        ],
      }),
    );
  });

  it("refuses an empty submission rather than sending nothing", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole("button", { name: /submit a scorecard/i }),
    );
    await user.click(screen.getByRole("button", { name: /submit scorecard/i }));

    expect(submitMutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /score at least one criterion/i,
    );
  });

  it("seeds the form from the caller's own previous submission", async () => {
    const user = userEvent.setup();
    useApplicationScorecards.mockReturnValue({
      data: {
        scorecardCount: 1,
        overallAverage: 4,
        criteriaAverages: [],
        scorecards: [
          {
            id: "s1",
            interviewerId: "u1",
            interviewerName: "Rae Cruter",
            isMine: true,
            templateId: "t1",
            templateTitle: "Engineering loop",
            overallComment: "Solid all round.",
            submittedAt: "2026-08-01T10:00:00.000Z",
            averageRating: 4,
            ratings: [
              {
                criterionId: "c1",
                criterionLabel: "Technical",
                rating: 4,
                comment: "Knows the stack",
              },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderPanel();

    // Framed as editing, because submitting again replaces rather than adds.
    await user.click(screen.getByRole("button", { name: /edit my scorecard/i }));

    expect(screen.getByDisplayValue("Knows the stack")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Solid all round.")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^4 out of 5$/, checked: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/replaces your previous submission/i),
    ).toBeInTheDocument();
  });
});
