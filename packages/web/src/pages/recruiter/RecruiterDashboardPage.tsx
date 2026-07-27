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
import { useRecruiterDashboard } from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";
import type { RecruiterApplicationStage } from "../../types/applications";

const stageOrder: RecruiterApplicationStage[] = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
];

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

export function RecruiterDashboardPage() {
  const dashboardQuery = useRecruiterDashboard();
  const dashboard = dashboardQuery.data;

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
                <Card key={label}>
                  <CardContent className="flex gap-4 p-5">
                    <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-2xl font-semibold">{value}</p>
                      <p className="text-sm text-muted-foreground">{label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Hiring funnel summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stageOrder.map((stage) => {
                    const count = dashboard.stageCounts[stage] ?? 0;
                    const percentage =
                      dashboard.metrics.totalApplications === 0
                        ? 0
                        : Math.round(
                            (count /
                              dashboard.metrics.totalApplications) *
                              100,
                          );

                    return (
                      <div key={stage}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {stageLabels[stage]}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
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
                        className="rounded-md border p-4"
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
