import { Company, FUNNEL_STAGE_ORDER, Job, type FunnelStage } from "@starter-kit/shared/db";
import { QueryTypes } from "sequelize";
import { createError } from "../middleware/error-handler";
import { getDatabase } from "../lib/db";
import { formatFunnelAggregates, SCORE_BUCKETS } from "./recruiter-analytics.service";

type NumericRow = Record<string, string | number | null>;

export interface RecruiterReportFilters {
  from: string;
  to: string;
  jobId?: string;
}

const number = (value: unknown): number => Number(value ?? 0);
const nullableNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Math.round(Number(value) * 10) / 10;

const FILTERED_APPLICATIONS = `
  SELECT a.*, j.title AS job_title
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
   WHERE j.company_id = :companyId
     AND a.stage <> 'DRAFT'
     AND a.submitted_at >= :from
     AND a.submitted_at < :toExclusive
     AND (:jobId::uuid IS NULL OR j.id = :jobId)`;

export class RecruiterReportsService {
  async getReport(companyId: string, filters: RecruiterReportFilters) {
    const sequelize = getDatabase();
    const company = await Company.findByPk(companyId, { attributes: ["id", "name"] });
    if (!company) throw createError("Company not found", 404);

    if (filters.jobId) {
      const ownedJob = await Job.findOne({
        where: { id: filters.jobId, companyId },
        attributes: ["id"],
      });
      if (!ownedJob) throw createError("Job not found", 404);
    }

    const from = new Date(`${filters.from}T00:00:00.000Z`);
    const toExclusive = new Date(`${filters.to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const replacements = {
      companyId,
      jobId: filters.jobId ?? null,
      from,
      toExclusive,
    };
    const days = Math.max(1, (toExclusive.getTime() - from.getTime()) / 86_400_000);
    const interval = days <= 120 ? "day" : days <= 730 ? "week" : "month";

    const [summaryRows, funnelRows, timeRows, scoreRows, jobRows, scorecardRows, timingRows] =
      await Promise.all([
        sequelize.query<NumericRow>(`
          WITH filtered AS (${FILTERED_APPLICATIONS})
          SELECT
            (SELECT COUNT(*) FROM filtered) AS total_applications,
            (SELECT COUNT(*) FROM jobs j WHERE j.company_id = :companyId
              AND j.created_at < :toExclusive
              AND (j.status = 'OPEN' OR j.updated_at >= :from)
              AND (:jobId::uuid IS NULL OR j.id = :jobId)) AS active_jobs,
            (SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id
              WHERE j.company_id = :companyId AND a.interview_scheduled_at >= :from
                AND a.interview_scheduled_at < :toExclusive
                AND (:jobId::uuid IS NULL OR j.id = :jobId)) AS interviews_scheduled,
            (SELECT COUNT(DISTINCT h.application_id) FROM application_stage_history h
              JOIN applications a ON a.id = h.application_id JOIN jobs j ON j.id = a.job_id
              WHERE j.company_id = :companyId AND h.to_stage = 'OFFER'
                AND h.changed_at >= :from AND h.changed_at < :toExclusive
                AND (:jobId::uuid IS NULL OR j.id = :jobId)) AS offers_made,
            (SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id
              WHERE j.company_id = :companyId AND a.hired_at >= :from
                AND a.hired_at < :toExclusive
                AND (:jobId::uuid IS NULL OR j.id = :jobId)) AS hires`, {
          replacements, type: QueryTypes.SELECT,
        }),
        sequelize.query<NumericRow>(`
          WITH filtered AS (${FILTERED_APPLICATIONS}),
          history AS (
            SELECT f.id,
              COUNT(DISTINCT h.to_stage) > 1 AS measured,
              MAX(CASE h.to_stage WHEN 'APPLIED' THEN 0 WHEN 'REVIEWED' THEN 1
                WHEN 'INTERVIEWING' THEN 2 WHEN 'OFFER' THEN 3 WHEN 'HIRED' THEN 4 ELSE -1 END) AS history_rank,
              MAX(h.from_stage) FILTER (WHERE h.to_stage = 'REJECTED') AS rejected_from
            FROM filtered f LEFT JOIN application_stage_history h ON h.application_id = f.id
            GROUP BY f.id
          ), effective AS (
            SELECT f.stage, h.measured, h.rejected_from,
              CASE WHEN h.measured THEN h.history_rank
                WHEN f.stage = 'REJECTED' THEN 0
                ELSE CASE f.stage WHEN 'APPLIED' THEN 0 WHEN 'REVIEWED' THEN 1
                  WHEN 'INTERVIEWING' THEN 2 WHEN 'OFFER' THEN 3 WHEN 'HIRED' THEN 4 ELSE -1 END END AS furthest
            FROM filtered f JOIN history h ON h.id = f.id
          )
          SELECT
            COUNT(*) AS total, COUNT(*) FILTER (WHERE measured) AS measured,
            COUNT(*) FILTER (WHERE stage = 'REJECTED') AS rejected,
            COUNT(*) FILTER (WHERE stage = 'REJECTED' AND rejected_from IS NULL) AS unattributed,
            COUNT(*) FILTER (WHERE stage = 'APPLIED') AS current_applied,
            COUNT(*) FILTER (WHERE stage = 'REVIEWED') AS current_reviewed,
            COUNT(*) FILTER (WHERE stage = 'INTERVIEWING') AS current_interviewing,
            COUNT(*) FILTER (WHERE stage = 'OFFER') AS current_offer,
            COUNT(*) FILTER (WHERE stage = 'HIRED') AS current_hired,
            COUNT(*) FILTER (WHERE furthest >= 0) AS reached_applied,
            COUNT(*) FILTER (WHERE furthest >= 1) AS reached_reviewed,
            COUNT(*) FILTER (WHERE furthest >= 2) AS reached_interviewing,
            COUNT(*) FILTER (WHERE furthest >= 3) AS reached_offer,
            COUNT(*) FILTER (WHERE furthest >= 4) AS reached_hired,
            COUNT(*) FILTER (WHERE rejected_from = 'APPLIED') AS rejected_applied,
            COUNT(*) FILTER (WHERE rejected_from = 'REVIEWED') AS rejected_reviewed,
            COUNT(*) FILTER (WHERE rejected_from = 'INTERVIEWING') AS rejected_interviewing,
            COUNT(*) FILTER (WHERE rejected_from = 'OFFER') AS rejected_offer,
            COUNT(*) FILTER (WHERE rejected_from = 'HIRED') AS rejected_hired
          FROM effective`, { replacements, type: QueryTypes.SELECT }),
        sequelize.query<NumericRow>(`
          SELECT COUNT(*) AS hired_count,
            AVG(EXTRACT(EPOCH FROM (a.hired_at - COALESCE(a.submitted_at, a.created_at))) / 86400) AS average_days,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.hired_at - COALESCE(a.submitted_at, a.created_at))) / 86400) AS median_days,
            MIN(EXTRACT(EPOCH FROM (a.hired_at - COALESCE(a.submitted_at, a.created_at))) / 86400) AS fastest_days,
            MAX(EXTRACT(EPOCH FROM (a.hired_at - COALESCE(a.submitted_at, a.created_at))) / 86400) AS slowest_days
          FROM applications a JOIN jobs j ON j.id = a.job_id
          WHERE j.company_id = :companyId AND a.hired_at >= :from AND a.hired_at < :toExclusive
            AND a.hired_at >= COALESCE(a.submitted_at, a.created_at)
            AND (:jobId::uuid IS NULL OR j.id = :jobId)`, { replacements, type: QueryTypes.SELECT }),
        sequelize.query<NumericRow>(`
          WITH filtered AS (${FILTERED_APPLICATIONS})
          SELECT COUNT(fit_score) AS scored_count, COUNT(*) - COUNT(fit_score) AS unscored_count,
            AVG(fit_score) AS average_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fit_score) FILTER (WHERE fit_score IS NOT NULL) AS median_score,
            COUNT(*) FILTER (WHERE fit_score BETWEEN 0 AND 20) AS bucket_0,
            COUNT(*) FILTER (WHERE fit_score BETWEEN 21 AND 40) AS bucket_1,
            COUNT(*) FILTER (WHERE fit_score BETWEEN 41 AND 60) AS bucket_2,
            COUNT(*) FILTER (WHERE fit_score BETWEEN 61 AND 80) AS bucket_3,
            COUNT(*) FILTER (WHERE fit_score BETWEEN 81 AND 100) AS bucket_4
          FROM filtered`, { replacements, type: QueryTypes.SELECT }),
        sequelize.query<NumericRow>(`
          WITH filtered AS (${FILTERED_APPLICATIONS})
          SELECT job_id, job_title, COUNT(*) AS applications,
            COUNT(*) FILTER (WHERE stage = 'APPLIED') AS applied,
            COUNT(*) FILTER (WHERE stage = 'REVIEWED') AS reviewed,
            COUNT(*) FILTER (WHERE stage = 'INTERVIEWING') AS interviewing,
            COUNT(*) FILTER (WHERE stage = 'OFFER') AS offer,
            COUNT(*) FILTER (WHERE stage = 'HIRED') AS hired,
            COUNT(*) FILTER (WHERE stage = 'REJECTED') AS rejected,
            AVG(fit_score) AS average_fit_score
          FROM filtered GROUP BY job_id, job_title ORDER BY applications DESC, job_title ASC`,
          { replacements, type: QueryTypes.SELECT }),
        sequelize.query<NumericRow>(`
          SELECT c.id AS criterion_id, c.label, COUNT(*) AS ratings, AVG(r.rating) AS average_rating
          FROM interview_scorecards s
          JOIN scorecard_ratings r ON r.scorecard_id = s.id
          JOIN scorecard_criteria c ON c.id = r.criterion_id
          JOIN applications a ON a.id = s.application_id JOIN jobs j ON j.id = a.job_id
          WHERE j.company_id = :companyId AND s.submitted_at >= :from AND s.submitted_at < :toExclusive
            AND (:jobId::uuid IS NULL OR j.id = :jobId)
          GROUP BY c.id, c.label ORDER BY c.label`, { replacements, type: QueryTypes.SELECT }),
        sequelize.query<NumericRow>(`
          WITH filtered AS (${FILTERED_APPLICATIONS})
          SELECT DATE_TRUNC('${interval}', submitted_at) AS period, COUNT(*) AS applications
          FROM filtered GROUP BY period ORDER BY period`, { replacements, type: QueryTypes.SELECT }),
      ]);

    const summary = summaryRows[0] ?? {};
    const funnel = funnelRows[0] ?? {};
    const score = scoreRows[0] ?? {};
    const time = timeRows[0] ?? {};
    const stageKey = (prefix: string, stage: FunnelStage) => `${prefix}_${stage.toLowerCase()}`;
    const reportFunnel = formatFunnelAggregates({
      total: number(funnel.total),
      measuredByHistory: number(funnel.measured),
      unattributedRejections: number(funnel.unattributed),
      counts: Object.fromEntries([
        ...FUNNEL_STAGE_ORDER.map((stage) => [stage, number(funnel[stageKey("current", stage)])]),
        ["REJECTED", number(funnel.rejected)],
      ]),
      reached: Object.fromEntries(FUNNEL_STAGE_ORDER.map((stage) => [stage, number(funnel[stageKey("reached", stage)])])),
      rejectedFrom: Object.fromEntries(FUNNEL_STAGE_ORDER.map((stage) => [stage, number(funnel[stageKey("rejected", stage)])])),
    });

    return {
      company: { id: company.id, name: company.name },
      range: { from: filters.from, to: filters.to },
      scope: { jobId: filters.jobId ?? null },
      generatedAt: new Date().toISOString(),
      hasActivity: number(summary.total_applications) > 0,
      summary: {
        totalApplications: number(summary.total_applications),
        activeJobs: number(summary.active_jobs),
        interviewsScheduled: number(summary.interviews_scheduled),
        offersMade: number(summary.offers_made),
        hires: number(summary.hires),
      },
      funnel: reportFunnel,
      timeToHire: {
        hiredCount: number(time.hired_count),
        averageDays: nullableNumber(time.average_days),
        medianDays: nullableNumber(time.median_days),
        fastestDays: nullableNumber(time.fastest_days),
        slowestDays: nullableNumber(time.slowest_days),
        trend: [],
      },
      scoreDistribution: {
        buckets: SCORE_BUCKETS.map((bucket, index) => ({ ...bucket, count: number(score[`bucket_${index}`]) })),
        scoredCount: number(score.scored_count),
        unscoredCount: number(score.unscored_count),
        averageScore: nullableNumber(score.average_score),
        medianScore: nullableNumber(score.median_score),
      },
      jobs: jobRows.map((row) => ({
        jobId: String(row.job_id), title: String(row.job_title), applications: number(row.applications),
        stageSpread: {
          APPLIED: number(row.applied), REVIEWED: number(row.reviewed), INTERVIEWING: number(row.interviewing),
          OFFER: number(row.offer), HIRED: number(row.hired), REJECTED: number(row.rejected),
        },
        hires: number(row.hired), averageFitScore: nullableNumber(row.average_fit_score),
      })),
      scorecards: scorecardRows.map((row) => ({
        criterionId: String(row.criterion_id), label: String(row.label), ratings: number(row.ratings),
        averageRating: nullableNumber(row.average_rating) as number,
      })),
      applicationsOverTime: timingRows.map((row) => ({
        period: new Date(String(row.period)).toISOString(), applications: number(row.applications),
      })),
      timingInterval: interval,
    };
  }

  toCsv(report: Awaited<ReturnType<RecruiterReportsService["getReport"]>>): string {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows: unknown[][] = [
      ["Section", "Job / stage", "Applications / reached", "Current stage spread", "Hires", "Average fit score", "Conversion from previous"],
      ...report.funnel.stages.map((stage) => ["Funnel", stage.stage, stage.reached, stage.count, "", "", stage.conversionFromPrevious ?? ""]),
      ["Funnel", "REJECTED", report.funnel.rejected, "", "", "", ""],
      ...report.jobs.map((job) => ["Job", job.title, job.applications,
        Object.entries(job.stageSpread).map(([stage, count]) => `${stage}: ${count}`).join("; "),
        job.hires, job.averageFitScore ?? "", ""]),
    ];
    return `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}\r\n`;
  }
}

export const recruiterReportsService = new RecruiterReportsService();
