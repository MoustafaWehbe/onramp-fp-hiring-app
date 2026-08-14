import {
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  MessageSquareMore,
  Send,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { FunnelChart } from "../../features/recruiter/components/FunnelChart";
import { ScoreDistributionChart } from "../../features/recruiter/components/ScoreDistributionChart";
import { TimeToHireCard } from "../../features/recruiter/components/TimeToHireCard";
import {
  useRecruiterAnalytics,
  useRecruiterDashboard,
} from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";
import { CARD_CLASS } from "../../features/candidate/theme";
import { CountUpNumber } from "../../components/shared/CountUpNumber";
import type { RecruiterApplicationStage } from "../../types/applications";

const stageLabels: Record<RecruiterApplicationStage, string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading recruiter dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}

function AnalyticsUnavailable({
  query,
}: {
  query: ReturnType<typeof useRecruiterAnalytics>;
}) {
  return (
    <div className="flex flex-col items-start gap-3" role="alert">
      <p className="text-sm text-muted-foreground">
        {getApiErrorMessage(
          query.error,
          "Couldn't load your company's hiring analytics.",
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
      >
        {query.isFetching ? "Refreshing…" : "Try again"}
      </Button>
    </div>
  );
}

export function RecruiterDashboardPage() {
  const dashboardQuery = useRecruiterDashboard();
  const analyticsQuery = useRecruiterAnalytics();
  const dashboard = dashboardQuery.data;
  const analytics = analyticsQuery.data;

  const metrics: Array<[LucideIcon, number, string]> = dashboard
    ? [
        [BriefcaseBusiness, dashboard.metrics.openJobs, "Open jobs"],
        [FileCheck2, dashboard.metrics.totalApplications, "Applications"],
        [MessageSquareMore, dashboard.metrics.interviewing, "Interviewing"],
        [Send, dashboard.metrics.offers, "Offers"],
        [CheckCircle2, dashboard.metrics.hires, "Hires"],
        [UsersRound, dashboard.metrics.totalJobs, "Total jobs"],
      ]
    : [];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Recruiter dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold">
              Keep hiring momentum visible.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Live job and application activity for your company. This view
              refreshes while you work.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/recruiter/company/create"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Company profile
            </Link>
            <Link
              to="/recruiter/jobs/create"
              className={cn(buttonVariants())}
            >
              Create job
            </Link>
            <Link
              to="/recruiter/jobs"
              className={cn(buttonVariants({ variant: "secondary" }))}
            >
              View jobs
            </Link>
          </div>
        </div>

        {dashboardQuery.isLoading && <DashboardSkeleton />}

        {dashboardQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="font-semibold">Dashboard unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getApiErrorMessage(
                    dashboardQuery.error,
                    "Couldn't load your company's hiring activity.",
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void dashboardQuery.refetch()}
                disabled={dashboardQuery.isFetching}
              >
                {dashboardQuery.isFetching ? "Refreshing…" : "Try again"}
              </Button>
            </CardContent>
          </Card>
        )}

        {dashboard && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map(([Icon, value, label]) => (
                <Card key={label} className={CARD_CLASS}>
                  <CardContent className="flex gap-4 p-5">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-3xl font-bold tracking-tight">
                        <CountUpNumber value={value} />
                      </p>
                      <p className="text-sm text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className={cn(CARD_CLASS, "mt-6")}>
              <CardHeader>
                <CardTitle className="text-xl">Time to hire</CardTitle>
                <p className="text-sm text-muted-foreground">
                  From a candidate submitting to being marked hired.
                </p>
              </CardHeader>
              <CardContent role="region" aria-label="Time to hire">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-40 rounded-md" />
                ) : analytics ? (
                  <TimeToHireCard timeToHire={analytics.timeToHire} />
                ) : (
                  <AnalyticsUnavailable query={analyticsQuery} />
                )}
              </CardContent>
            </Card>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <Card className={CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-xl">Funnel conversion</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How far applications get across every job you own.
                  </p>
                </CardHeader>
                <CardContent role="region" aria-label="Funnel conversion">
                  {analyticsQuery.isLoading ? (
                    <Skeleton className="h-64 rounded-md" />
                  ) : analytics ? (
                    <FunnelChart
                      stages={analytics.funnel.stages}
                      rejected={analytics.funnel.rejected}
                      totalApplications={analytics.totalApplications}
                    />
                  ) : (
                    <AnalyticsUnavailable query={analyticsQuery} />
                  )}
                </CardContent>
              </Card>

              <Card className={CARD_CLASS}>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Fit score distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI fit scores across your company's applications.
                  </p>
                </CardHeader>
                <CardContent
                  role="region"
                  aria-label="Fit score distribution"
                >
                  {analyticsQuery.isLoading ? (
                    <Skeleton className="h-64 rounded-md" />
                  ) : analytics ? (
                    <ScoreDistributionChart
                      distribution={analytics.scoreDistribution}
                    />
                  ) : (
                    <AnalyticsUnavailable query={analyticsQuery} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-5">
              <Card className={CARD_CLASS}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xl">Recent applicants</CardTitle>
                  <Link
                    to="/recruiter/jobs"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    All jobs
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboard.recentApplicants.length === 0 ? (
                    <div className="rounded-md border border-dashed p-5">
                      <p className="font-medium">No applications yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        New candidate submissions will appear here.
                      </p>
                    </div>
                  ) : (
                    dashboard.recentApplicants.map((application) => (
                      <div
                        key={application.id}
                        className="rounded-md border p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={`/recruiter/candidates/${application.candidateProfile.id}`}
                              className="font-medium hover:underline"
                            >
                              {application.candidateProfile.user.name}
                            </Link>
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {application.jobTitle}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {stageLabels[application.stage]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>
                            {application.submittedAt
                              ? `Applied ${formatDate(application.submittedAt)}`
                              : "Submission date unavailable"}
                          </span>
                          <Link
                            to={`/recruiter/pipeline/${application.jobId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            View pipeline
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
