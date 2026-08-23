import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Download,
  FileChartColumn,
  FileText,
  MessageSquareMore,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { LockedFeatureState } from "../../components/shared/LockedFeatureState";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useCompanyProfile } from "../../features/company/hooks";
import { CARD_CLASS } from "../../features/candidate/theme";
import { useRecruiterJobs } from "../../features/jobs/hooks";
import { downloadRecruiterReportCsv } from "../../features/recruiter/api";
import { CHART_TOKENS, ChartTooltipCard, axisTickStyle } from "../../features/recruiter/components/charts";
import { FunnelChart } from "../../features/recruiter/components/FunnelChart";
import { ScoreDistributionChart } from "../../features/recruiter/components/ScoreDistributionChart";
import { useRecruiterReport } from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type { RecruiterReportFilters, RecruiterReportRecord } from "../../types/analytics";

const DAY_MS = 86_400_000;
const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * DAY_MS);
  return { from: isoDate(from), to: isoDate(to) };
}

function presetRange(preset: "30-days" | "quarter" | "ytd") {
  const now = new Date();
  if (preset === "30-days") return defaultRange();
  if (preset === "ytd") {
    return { from: `${now.getUTCFullYear()}-01-01`, to: isoDate(now) };
  }
  const currentQuarter = Math.floor(now.getUTCMonth() / 3);
  const end = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
  return { from: isoDate(start), to: isoDate(end) };
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00.000Z`),
  );
}

function ReportLoading() {
  return (
    <div className="space-y-5" aria-label="Generating hiring report">
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function SummaryHeader({ report, jobTitle }: { report: RecruiterReportRecord; jobTitle?: string }) {
  const metrics = [
    [FileText, report.summary.totalApplications, "Applications"],
    [BriefcaseBusiness, report.summary.activeJobs, "Active jobs"],
    [MessageSquareMore, report.summary.interviewsScheduled, "Interviews"],
    [Send, report.summary.offersMade, "Offers"],
    [CheckCircle2, report.summary.hires, "Hires"],
  ] as const;

  return (
    <section className="report-summary rounded-2xl bg-slate-950 px-6 py-7 text-white shadow-xl print:shadow-none sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Hiring report</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{report.company.name}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {displayDate(report.range.from)} – {displayDate(report.range.to)}
            {jobTitle ? ` · ${jobTitle}` : " · All jobs"}
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Generated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}
        </p>
      </div>
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/15 sm:grid-cols-5">
        {metrics.map(([Icon, value, label]) => (
          <div key={label} className="bg-slate-900/80 p-4">
            <dt className="flex items-center gap-2 text-xs text-slate-300"><Icon className="h-3.5 w-3.5" />{label}</dt>
            <dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ApplicationsTrend({ report }: { report: RecruiterReportRecord }) {
  const data = report.applicationsOverTime.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: report.timingInterval === "day" ? "numeric" : undefined,
      year: report.timingInterval === "month" ? "2-digit" : undefined,
      timeZone: "UTC",
    }).format(new Date(point.period)),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_TOKENS.grid} />
        <XAxis dataKey="label" tick={axisTickStyle} tickLine={false} stroke={CHART_TOKENS.axis} minTickGap={28} />
        <YAxis allowDecimals={false} tick={axisTickStyle} tickLine={false} axisLine={false} />
        <Tooltip content={({ active, payload }) => {
          const point = payload?.[0]?.payload as { label: string; applications: number } | undefined;
          return active && point ? <ChartTooltipCard label={point.label} rows={[{ name: "Applications", value: String(point.applications) }]} /> : null;
        }} />
        <Line type="monotone" dataKey="applications" stroke={CHART_TOKENS.series} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ReportDocument({ report, jobTitle }: { report: RecruiterReportRecord; jobTitle?: string }) {
  const lowSample = report.summary.totalApplications < 5;
  const displayedFunnel = lowSample
    ? report.funnel.stages.map((stage) => ({ ...stage, conversionFromPrevious: null }))
    : report.funnel.stages;

  return (
    <article className="report-print-root space-y-6" aria-label="Hiring report">
      <SummaryHeader report={report} jobTitle={jobTitle} />

      {!report.hasActivity ? (
        <Card className={cn(CARD_CLASS, "report-section border-dashed")}>
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No activity in this period</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              No applications were submitted for this scope and date range. Choose a broader period or another job to generate a populated report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="report-section grid gap-5 lg:grid-cols-2">
            <Card className={CARD_CLASS}>
              <CardHeader><CardTitle>Hiring funnel</CardTitle><p className="text-sm text-muted-foreground">Furthest stage reached, with rejection kept as a separate exit.</p></CardHeader>
              <CardContent>
                <FunnelChart stages={displayedFunnel} rejected={report.funnel.rejected} totalApplications={report.summary.totalApplications} />
                {lowSample && <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Low sample size: conversion percentages are suppressed until at least five applications are present.</p>}
              </CardContent>
            </Card>
            <Card className={CARD_CLASS}>
              <CardHeader><CardTitle>Time to hire</CardTitle><p className="text-sm text-muted-foreground">Completed hires during this period, measured from submission.</p></CardHeader>
              <CardContent>
                {report.timeToHire.hiredCount === 0 ? (
                  <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed p-6 text-center">
                    <div><p className="font-medium">No completed hires in this period</p><p className="mt-1 text-sm text-muted-foreground">Time-to-hire is not reported as zero when there are no completed hires.</p></div>
                  </div>
                ) : (
                  <dl className="grid min-h-[260px] content-center grid-cols-2 gap-4">
                    {[["Average", report.timeToHire.averageDays], ["Median", report.timeToHire.medianDays], ["Fastest", report.timeToHire.fastestDays], ["Slowest", report.timeToHire.slowestDays]].map(([label, value]) => (
                      <div key={label} className="rounded-xl border bg-muted/30 p-5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-3xl font-bold tabular-nums">{value} <span className="text-base font-medium">days</span></dd></div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="report-section grid gap-5 lg:grid-cols-2">
            <Card className={CARD_CLASS}><CardHeader><CardTitle>Fit score distribution</CardTitle><p className="text-sm text-muted-foreground">AI fit scores for applications submitted in range.</p></CardHeader><CardContent><ScoreDistributionChart distribution={report.scoreDistribution} /></CardContent></Card>
            <Card className={CARD_CLASS}><CardHeader><CardTitle>Applications over time</CardTitle><p className="text-sm text-muted-foreground">Submission volume grouped by {report.timingInterval}.</p></CardHeader><CardContent><ApplicationsTrend report={report} /></CardContent></Card>
          </div>

          <Card className={cn(CARD_CLASS, "report-section")}>
            <CardHeader><CardTitle>Job breakdown</CardTitle><p className="text-sm text-muted-foreground">Volume, current pipeline shape, hires, and average fit by role.</p></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="pb-3 font-medium">Job</th><th className="pb-3 text-right font-medium">Applications</th><th className="pb-3 pl-5 font-medium">Current stage spread</th><th className="pb-3 text-right font-medium">Hires</th><th className="pb-3 text-right font-medium">Avg. fit</th></tr></thead>
                <tbody>{report.jobs.map((job) => (
                  <tr key={job.jobId} className="border-b last:border-0"><th className="py-4 pr-4 text-left font-medium">{job.title}</th><td className="py-4 text-right tabular-nums">{job.applications}</td><td className="py-4 pl-5"><div className="flex flex-wrap gap-1.5">{Object.entries(job.stageSpread).filter(([, count]) => count > 0).map(([stage, count]) => <span key={stage} className="rounded-full bg-muted px-2 py-1 text-xs">{STAGE_LABELS[stage]} {count}</span>)}</div></td><td className="py-4 text-right tabular-nums">{job.hires}</td><td className="py-4 text-right tabular-nums">{job.averageFitScore ?? "—"}</td></tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>

          {report.scorecards.length > 0 && (
            <Card className={cn(CARD_CLASS, "report-section")}>
              <CardHeader><CardTitle>Scorecard summary</CardTitle><p className="text-sm text-muted-foreground">Average submitted rating by criterion on a five-point scale.</p></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{report.scorecards.map((criterion) => (
                <div key={criterion.criterionId} className="rounded-xl border p-4"><div className="flex items-baseline justify-between gap-3"><p className="font-medium">{criterion.label}</p><p className="text-xl font-bold tabular-nums">{criterion.averageRating}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${criterion.averageRating * 20}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{criterion.ratings} rating{criterion.ratings === 1 ? "" : "s"}</p></div>
              ))}</CardContent>
            </Card>
          )}
        </>
      )}
    </article>
  );
}

function ReportsWorkspace() {
  const jobsQuery = useRecruiterJobs();
  const [range, setRange] = useState(defaultRange);
  const [jobId, setJobId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const validRange = range.from <= range.to;
  const filters = useMemo<RecruiterReportFilters>(() => ({ ...range, ...(jobId ? { jobId } : {}) }), [range, jobId]);
  const reportQuery = useRecruiterReport(filters, { enabled: validRange });
  const jobTitle = jobsQuery.data?.find((job) => job.id === jobId)?.title;

  async function exportCsv() {
    setDownloading(true);
    try {
      const blob = await downloadRecruiterReportCsv(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `hiring-report-${range.from}-${range.to}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't export the CSV report."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="report-controls mb-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium">From<input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} className="mt-1.5 block h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
            <label className="text-sm font-medium">To<input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} className="mt-1.5 block h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
            <label className="text-sm font-medium">Scope<select value={jobId} onChange={(event) => setJobId(event.target.value)} className="mt-1.5 block h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">All jobs</option>{jobsQuery.data?.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setRange(presetRange("30-days"))}>Last 30 days</Button>
            <Button variant="outline" size="sm" onClick={() => setRange(presetRange("quarter"))}>Last quarter</Button>
            <Button variant="outline" size="sm" onClick={() => setRange(presetRange("ytd"))}>Year to date</Button>
          </div>
        </div>
        {!validRange && <p className="mt-3 text-sm text-destructive">The end date must be on or after the start date.</p>}
      </div>

      <div className="report-actions mb-6 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => window.print()} disabled={!reportQuery.data}><FileText className="mr-2 h-4 w-4" />Export PDF</Button>
        <Button onClick={() => void exportCsv()} disabled={!reportQuery.data || downloading}><Download className="mr-2 h-4 w-4" />{downloading ? "Exporting…" : "Export CSV"}</Button>
      </div>

      {reportQuery.isLoading && <ReportLoading />}
      {reportQuery.isError && <Card role="alert"><CardContent className="p-6"><p className="font-medium">Report unavailable</p><p className="mt-1 text-sm text-muted-foreground">{getApiErrorMessage(reportQuery.error, "Couldn't generate this hiring report.")}</p><Button className="mt-4" variant="outline" onClick={() => void reportQuery.refetch()}>Try again</Button></CardContent></Card>}
      {reportQuery.data && <ReportDocument report={reportQuery.data} jobTitle={jobTitle} />}
    </>
  );
}

export function RecruiterReportsPage() {
  const companyQuery = useCompanyProfile();
  const isPro = companyQuery.data?.subscriptionTier === "PRO";

  return (
    <div>
      <div className="report-page-heading mb-7">
        <p className="text-sm font-medium text-primary">Recruiter reports</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Turn hiring activity into a clear story.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Filter a polished hiring report, share it on screen, or export it for leadership.</p>
      </div>
      {companyQuery.isLoading ? <Skeleton className="h-72 rounded-xl" /> : isPro ? <ReportsWorkspace /> : <LockedFeatureState icon={FileChartColumn} title="Reports are a Pro feature" description="Upgrade to create date- and job-scoped hiring reports and export them as PDF or CSV." />}
    </div>
  );
}
