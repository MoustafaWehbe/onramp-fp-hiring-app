import {
  Application,
  ApplicationStageHistory,
  FUNNEL_STAGE_ORDER,
  HIRED_STAGE,
  Job,
  type ApplicationStage,
  type FunnelStage,
} from "@starter-kit/shared/db";
import { Op } from "sequelize";

interface ApplicationRow {
  id: string;
  stage: FunnelStage | "REJECTED";
  fitScore: number | null;
  submittedAt: Date | null;
  createdAt: Date;
  hiredAt: Date | null;
}

interface StageHistoryRow {
  applicationId: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  changedAt: Date;
}

/**
 * Score buckets. Upper-bound inclusive and contiguous, so every 0-100 score
 * lands in exactly one bucket and the counts sum to the scored total.
 */
export const SCORE_BUCKETS = [
  { label: "0–20", min: 0, max: 20 },
  { label: "21–40", min: 21, max: 40 },
  { label: "41–60", min: 41, max: 60 },
  { label: "61–80", min: 61, max: 80 },
  { label: "81–100", min: 81, max: 100 },
] as const;

/** Below this, an average is noise rather than a metric. */
const MIN_HIRES_FOR_TIME_TO_HIRE = 1;
const TREND_MONTHS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FunnelStageStats {
  stage: FunnelStage;
  /** Applications sitting in this stage right now. */
  count: number;
  /** Applications that reached this stage or moved past it. */
  reached: number;
  /** Share of all submitted applications that reached this stage. */
  reachedPercentage: number;
  /** Share of the previous stage that reached this one; null for the first. */
  conversionFromPrevious: number | null;
  /** Applications rejected while sitting in this stage, from real history. */
  rejectedFrom: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function roundTo(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * The furthest point along the funnel a set of visited stages represents.
 *
 * Off-progression stages (REJECTED) contribute nothing: being rejected is an
 * exit, not a step forward. An application whose only recorded stages are
 * APPLIED and REJECTED got as far as APPLIED.
 */
function furthestFunnelIndex(visited: Set<string>): number {
  let furthest = -1;

  for (const stage of visited) {
    const index = FUNNEL_STAGE_ORDER.indexOf(stage as FunnelStage);

    if (index > furthest) {
      furthest = index;
    }
  }

  return furthest;
}

function percentage(part: number, whole: number): number {
  // Every ratio here divides by a count that can legitimately be zero — a
  // company with no applications, or a funnel stage nobody reached.
  return whole === 0 ? 0 : roundTo((part / whole) * 100);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class RecruiterAnalyticsService {
  /**
   * Every query here is scoped by an inner join to the company's jobs.
   * Applications carry no companyId of their own, so scoping runs through the
   * parent job — the same ownership path the rest of the API uses.
   */
  private companyScope(companyId: string) {
    return {
      where: { stage: { [Op.ne]: "DRAFT" as const } },
      include: [
        {
          model: Job,
          as: "job",
          attributes: [],
          where: { companyId },
          required: true,
        },
      ],
    };
  }

  async getAnalytics(companyId: string) {
    const [rows, history] = await Promise.all([
      Application.findAll({
        attributes: [
          "id",
          "stage",
          "fitScore",
          "submittedAt",
          "createdAt",
          "hiredAt",
        ],
        ...this.companyScope(companyId),
        raw: true,
      }) as unknown as Promise<ApplicationRow[]>,
      // Scoped through the application's job the same way, so history never
      // leaks across companies.
      ApplicationStageHistory.findAll({
        attributes: ["applicationId", "fromStage", "toStage", "changedAt"],
        include: [
          {
            model: Application,
            as: "application",
            attributes: [],
            required: true,
            include: [
              {
                model: Job,
                as: "job",
                attributes: [],
                where: { companyId },
                required: true,
              },
            ],
          },
        ],
        order: [["changedAt", "ASC"]],
        raw: true,
      }) as unknown as Promise<StageHistoryRow[]>,
    ]);

    return {
      totalApplications: rows.length,
      funnel: this.buildFunnel(rows, history),
      timeToHire: this.buildTimeToHire(rows),
      scoreDistribution: this.buildScoreDistribution(rows),
    };
  }

  /**
   * Reach is read from recorded history where it exists: an application that
   * was rejected out of INTERVIEWING still counts as having reached REVIEWED
   * and INTERVIEWING, which the previous current-stage-only version could not
   * see. That was phase 5's documented gap, and stage history closes it.
   *
   * Applications that predate the history table have only their submission
   * entry, so they keep the old forward-progression inference from their
   * current stage. `historyCoverage` reports how much of the funnel is
   * measured rather than inferred, so a sparse period is visible instead of
   * being quietly averaged in.
   */
  private buildFunnel(rows: ApplicationRow[], history: StageHistoryRow[]) {
    const reachedByApplication = new Map<string, Set<string>>();
    const rejectionExits = new Map<string, string | null>();

    for (const row of history) {
      const reached =
        reachedByApplication.get(row.applicationId) ?? new Set<string>();
      reached.add(row.toStage);
      reachedByApplication.set(row.applicationId, reached);

      if (row.toStage === "REJECTED") {
        // The stage they were in when rejected — the whole point of history.
        rejectionExits.set(row.applicationId, row.fromStage ?? null);
      }
    }

    const counts = new Map<string, number>();
    const reachedCounts = new Map<string, number>();
    const rejectionsByStage = new Map<string, number>();
    let measuredByHistory = 0;
    let unattributedRejections = 0;

    for (const row of rows) {
      counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);

      const recorded = reachedByApplication.get(row.id);
      // A lone submission entry is the backfill, not observed progression.
      const hasRealHistory = Boolean(recorded && recorded.size > 1);

      if (hasRealHistory) {
        measuredByHistory += 1;
      }

      // How far this application actually got, as an index into the
      // progression. Read from history when there is any, inferred from the
      // current stage otherwise.
      const furthestIndex = hasRealHistory
        ? furthestFunnelIndex(recorded!)
        : // REJECTED is not on the progression and has no index of its own.
          // Without history, all that is known is that they applied — the
          // stage they were rejected from is exactly what went unrecorded.
          row.stage === "REJECTED"
          ? 0
          : FUNNEL_STAGE_ORDER.indexOf(row.stage as FunnelStage);

      for (const index of FUNNEL_STAGE_ORDER.keys()) {
        // "Got at least this far", not "sat in this exact stage". Stage
        // skipping is allowed by design, so testing membership would invent a
        // drop-off at every stage a recruiter jumped over — and let a later
        // stage out-count an earlier one, which is how a funnel ends up
        // reporting a conversion above 100%.
        if (furthestIndex >= index) {
          const stage = FUNNEL_STAGE_ORDER[index];
          reachedCounts.set(stage, (reachedCounts.get(stage) ?? 0) + 1);
        }
      }

      if (row.stage === "REJECTED") {
        const exit = rejectionExits.get(row.id);

        if (exit && exit !== "REJECTED") {
          rejectionsByStage.set(exit, (rejectionsByStage.get(exit) ?? 0) + 1);
        } else {
          unattributedRejections += 1;
        }
      }
    }

    const total = rows.length;
    const rejected = counts.get("REJECTED") ?? 0;

    const stages: FunnelStageStats[] = FUNNEL_STAGE_ORDER.map(
      (stage, index) => {
        const reached = reachedCounts.get(stage) ?? 0;
        const previousReached =
          index === 0
            ? null
            : (reachedCounts.get(FUNNEL_STAGE_ORDER[index - 1]) ?? 0);

        return {
          stage,
          count: counts.get(stage) ?? 0,
          reached,
          reachedPercentage: percentage(reached, total),
          // Null rather than 0 when nobody reached the prior stage: there is
          // no rate to report, and "0%" would read as a total drop-off.
          conversionFromPrevious:
            previousReached === null || previousReached === 0
              ? null
              : percentage(reached, previousReached),
          rejectedFrom: rejectionsByStage.get(stage) ?? 0,
        };
      },
    );

    return {
      stages,
      rejected,
      rejectedPercentage: percentage(rejected, total),
      unattributedRejections,
      historyCoverage: {
        measured: measuredByHistory,
        total,
        percentage: percentage(measuredByHistory, total),
      },
    };
  }

  /**
   * Measured from submission to the hiredAt stamp. Applications still in
   * flight are not counted — including them would report a number that only
   * ever grows and says nothing about how long hiring takes.
   */
  private buildTimeToHire(
    rows: Array<{
      stage: FunnelStage | "REJECTED";
      submittedAt: Date | null;
      createdAt: Date;
      hiredAt: Date | null;
    }>,
  ) {
    const hires = rows
      .filter((row) => row.stage === HIRED_STAGE && row.hiredAt)
      .map((row) => {
        const start = row.submittedAt ?? row.createdAt;
        const hiredAt = row.hiredAt as Date;

        return {
          hiredAt,
          days: (hiredAt.getTime() - new Date(start).getTime()) / DAY_MS,
        };
      })
      // A clock skew or a bad backfill should not produce a negative average.
      .filter((hire) => hire.days >= 0);

    if (hires.length < MIN_HIRES_FOR_TIME_TO_HIRE) {
      return {
        hiredCount: 0,
        averageDays: null,
        medianDays: null,
        fastestDays: null,
        slowestDays: null,
        trend: [],
      };
    }

    const durations = hires.map((hire) => hire.days);
    const byMonth = new Map<string, number[]>();

    for (const hire of hires) {
      const key = monthKey(hire.hiredAt);
      byMonth.set(key, [...(byMonth.get(key) ?? []), hire.days]);
    }

    const trend = [...byMonth.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-TREND_MONTHS)
      .map(([month, monthDurations]) => ({
        month,
        hires: monthDurations.length,
        averageDays: roundTo(
          monthDurations.reduce((sum, value) => sum + value, 0) /
            monthDurations.length,
        ),
      }));

    return {
      hiredCount: hires.length,
      averageDays: roundTo(
        durations.reduce((sum, value) => sum + value, 0) / durations.length,
      ),
      medianDays: roundTo(median(durations) as number),
      fastestDays: roundTo(Math.min(...durations)),
      slowestDays: roundTo(Math.max(...durations)),
      trend,
    };
  }

  private buildScoreDistribution(rows: Array<{ fitScore: number | null }>) {
    const buckets = SCORE_BUCKETS.map((bucket) => ({
      label: bucket.label,
      min: bucket.min,
      max: bucket.max,
      count: 0,
    }));
    let scoredCount = 0;

    for (const row of rows) {
      if (row.fitScore === null || row.fitScore === undefined) {
        continue;
      }

      const score = Number(row.fitScore);
      const bucket = buckets.find(
        (candidate) => score >= candidate.min && score <= candidate.max,
      );

      if (bucket) {
        bucket.count += 1;
        scoredCount += 1;
      }
    }

    const scores = rows
      .map((row) => row.fitScore)
      .filter((score): score is number => score !== null && score !== undefined)
      .map(Number);

    return {
      buckets,
      scoredCount,
      unscoredCount: rows.length - scoredCount,
      averageScore:
        scores.length === 0
          ? null
          : roundTo(
              scores.reduce((sum, score) => sum + score, 0) / scores.length,
            ),
      medianScore: scores.length === 0 ? null : roundTo(median(scores) as number),
    };
  }

  emptyAnalytics() {
    return {
      totalApplications: 0,
      funnel: {
        stages: FUNNEL_STAGE_ORDER.map((stage, index) => ({
          stage,
          count: 0,
          reached: 0,
          reachedPercentage: 0,
          conversionFromPrevious: index === 0 ? null : 0,
          rejectedFrom: 0,
        })),
        rejected: 0,
        rejectedPercentage: 0,
        unattributedRejections: 0,
        historyCoverage: { measured: 0, total: 0, percentage: 0 },
      },
      timeToHire: {
        hiredCount: 0,
        averageDays: null,
        medianDays: null,
        fastestDays: null,
        slowestDays: null,
        trend: [],
      },
      scoreDistribution: {
        buckets: SCORE_BUCKETS.map((bucket) => ({ ...bucket, count: 0 })),
        scoredCount: 0,
        unscoredCount: 0,
        averageScore: null,
        medianScore: null,
      },
    };
  }
}

export const recruiterAnalyticsService = new RecruiterAnalyticsService();
