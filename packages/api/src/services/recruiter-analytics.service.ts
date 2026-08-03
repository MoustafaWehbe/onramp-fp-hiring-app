import {
  Application,
  FUNNEL_STAGE_ORDER,
  HIRED_STAGE,
  Job,
  type FunnelStage,
} from "@starter-kit/shared/db";
import { Op } from "sequelize";

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
    const rows = (await Application.findAll({
      attributes: ["stage", "fitScore", "submittedAt", "createdAt", "hiredAt"],
      ...this.companyScope(companyId),
      raw: true,
    })) as unknown as Array<{
      stage: FunnelStage | "REJECTED";
      fitScore: number | null;
      submittedAt: Date | null;
      createdAt: Date;
      hiredAt: Date | null;
    }>;

    return {
      totalApplications: rows.length,
      funnel: this.buildFunnel(rows),
      timeToHire: this.buildTimeToHire(rows),
      scoreDistribution: this.buildScoreDistribution(rows),
    };
  }

  /**
   * Conversion is derived from where applications sit now, assuming forward
   * progression: an application in OFFER necessarily passed through REVIEWED.
   *
   * The honest limitation: without a stage-history table a REJECTED
   * application cannot be attributed to the stage it was rejected from, so
   * rejections are reported as a separate exit rather than being folded into
   * any one stage's conversion. Recording transitions would make this exact.
   */
  private buildFunnel(
    rows: Array<{ stage: FunnelStage | "REJECTED" }>,
  ): {
    stages: FunnelStageStats[];
    rejected: number;
    rejectedPercentage: number;
  } {
    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
    }

    const total = rows.length;
    const rejected = counts.get("REJECTED") ?? 0;

    const stages = FUNNEL_STAGE_ORDER.map((stage, index) => {
      const count = counts.get(stage) ?? 0;
      // Everyone at this stage or any later one has reached it.
      const reached = FUNNEL_STAGE_ORDER.slice(index).reduce(
        (sum, laterStage) => sum + (counts.get(laterStage) ?? 0),
        0,
      );

      return { stage, count, reached };
    });

    return {
      stages: stages.map((entry, index) => ({
        ...entry,
        reachedPercentage: percentage(entry.reached, total),
        conversionFromPrevious:
          index === 0
            ? null
            : percentage(entry.reached, stages[index - 1].reached),
      })),
      rejected,
      rejectedPercentage: percentage(rejected, total),
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
        })),
        rejected: 0,
        rejectedPercentage: 0,
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
