import { RecruiterAnalyticsService } from "../../src/services/recruiter-analytics.service";

/**
 * buildFunnel is private because nothing outside the service should call it,
 * but the stage-ordering rules it encodes are exactly what regressed twice,
 * so they are pinned here directly.
 */
type FunnelArgs = Parameters<
  RecruiterAnalyticsService["buildFunnel" & keyof RecruiterAnalyticsService]
>;

const service = new RecruiterAnalyticsService();
const buildFunnel = (
  service as unknown as {
    buildFunnel: (...args: unknown[]) => {
      stages: Array<{
        stage: string;
        count: number;
        reached: number;
        conversionFromPrevious: number | null;
        rejectedFrom: number;
      }>;
      rejected: number;
      unattributedRejections: number;
      historyCoverage: { measured: number; total: number; percentage: number };
    };
  }
).buildFunnel.bind(service);

function application(
  id: string,
  stage: string,
): Record<string, unknown> {
  return {
    id,
    stage,
    fitScore: null,
    submittedAt: new Date("2026-07-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    hiredAt: null,
  };
}

function historyRow(
  applicationId: string,
  fromStage: string | null,
  toStage: string,
): Record<string, unknown> {
  return {
    applicationId,
    fromStage,
    toStage,
    changedAt: new Date("2026-07-02T00:00:00.000Z"),
  };
}

function stageOf(
  funnel: ReturnType<typeof buildFunnel>,
  stage: string,
): { reached: number; conversionFromPrevious: number | null; rejectedFrom: number } {
  return funnel.stages.find((entry) => entry.stage === stage)!;
}

describe("funnel reach and conversion", () => {
  it("counts a rejection recorded in history as having reached its exit stage", () => {
    const funnel = buildFunnel(
      [application("a1", "REJECTED")],
      [
        historyRow("a1", null, "APPLIED"),
        historyRow("a1", "APPLIED", "REVIEWED"),
        historyRow("a1", "REVIEWED", "INTERVIEWING"),
        historyRow("a1", "INTERVIEWING", "REJECTED"),
      ],
    );

    expect(stageOf(funnel, "APPLIED").reached).toBe(1);
    expect(stageOf(funnel, "REVIEWED").reached).toBe(1);
    expect(stageOf(funnel, "INTERVIEWING").reached).toBe(1);
    // Rejected out of interviewing never reached offer.
    expect(stageOf(funnel, "OFFER").reached).toBe(0);
    expect(stageOf(funnel, "INTERVIEWING").rejectedFrom).toBe(1);
    expect(funnel.unattributedRejections).toBe(0);
  });

  it("still credits APPLIED for a rejection that predates stage history", () => {
    // Only the backfilled submission row exists — the regression was counting
    // this application as having reached no stage at all.
    const funnel = buildFunnel(
      [application("a1", "REJECTED")],
      [historyRow("a1", null, "APPLIED")],
    );

    expect(stageOf(funnel, "APPLIED").reached).toBe(1);
    expect(stageOf(funnel, "REVIEWED").reached).toBe(0);
    expect(funnel.unattributedRejections).toBe(1);
    expect(funnel.historyCoverage.measured).toBe(0);
  });

  it("treats a skipped stage as reached, since skipping is allowed", () => {
    // The product permits APPLIED -> OFFER directly. Testing set membership
    // reported nobody reaching REVIEWED or INTERVIEWING, which invented two
    // drop-offs and let OFFER out-count the stage before it.
    const funnel = buildFunnel(
      [application("a1", "OFFER")],
      [
        historyRow("a1", null, "APPLIED"),
        historyRow("a1", "APPLIED", "OFFER"),
      ],
    );

    expect(stageOf(funnel, "REVIEWED").reached).toBe(1);
    expect(stageOf(funnel, "INTERVIEWING").reached).toBe(1);
    expect(stageOf(funnel, "OFFER").reached).toBe(1);
  });

  it("never reports a conversion above 100 percent", () => {
    const funnel = buildFunnel(
      [
        application("a1", "OFFER"),
        application("a2", "OFFER"),
        application("a3", "INTERVIEWING"),
      ],
      [
        historyRow("a1", null, "APPLIED"),
        historyRow("a1", "APPLIED", "OFFER"),
        historyRow("a2", null, "APPLIED"),
        historyRow("a2", "APPLIED", "OFFER"),
        historyRow("a3", null, "APPLIED"),
        historyRow("a3", "APPLIED", "INTERVIEWING"),
      ],
    );

    for (const stage of funnel.stages) {
      if (stage.conversionFromPrevious !== null) {
        expect(stage.conversionFromPrevious).toBeLessThanOrEqual(100);
      }
    }

    // Reach must be non-increasing along the funnel.
    const reaches = funnel.stages.map((stage) => stage.reached);
    for (let index = 1; index < reaches.length; index += 1) {
      expect(reaches[index]).toBeLessThanOrEqual(reaches[index - 1]);
    }
  });

  it("reports no conversion rate when nobody reached the previous stage", () => {
    const funnel = buildFunnel(
      [application("a1", "APPLIED")],
      [historyRow("a1", null, "APPLIED")],
    );

    // 0 of 0 is not a 0% drop-off; there is simply no rate to report.
    expect(stageOf(funnel, "OFFER").conversionFromPrevious).toBeNull();
    expect(stageOf(funnel, "HIRED").conversionFromPrevious).toBeNull();
  });

  it("handles a company with no applications without dividing by zero", () => {
    const funnel = buildFunnel([], []);

    expect(funnel.rejected).toBe(0);
    expect(funnel.historyCoverage.percentage).toBe(0);
    for (const stage of funnel.stages) {
      expect(stage.reached).toBe(0);
      expect(Number.isNaN(stage.conversionFromPrevious ?? 0)).toBe(false);
    }
  });
});

// Keeps the unused type alias honest about what it documents.
export type { FunnelArgs };
