import {
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  UsersRound,
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
import { useRecruiterJobs } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { employmentTypeLabels } from "../../lib/job-presentation";
import { cn, formatDate } from "../../lib/utils";
import type { RecruiterJobStatus } from "../../types/jobs";

const statusLabels: Record<RecruiterJobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

function RecruiterJobSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-7 w-3/5" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RecruiterJobsPage() {
  const jobsQuery = useRecruiterJobs();
  const jobs = jobsQuery.data ?? [];

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Recruiter jobs</p>
            <h1 className="mt-2 text-4xl font-bold">
              Jobs you are hiring for.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Monitor your company&apos;s postings and jump straight into
              candidate review.
            </p>
          </div>
          <Link
            to="/recruiter/jobs/create"
            className={buttonVariants({ variant: "default" })}
          >
            Create job
          </Link>
        </div>

        {jobsQuery.isLoading ? (
          <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Loading recruiter jobs"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <RecruiterJobSkeleton key={index} />
            ))}
          </div>
        ) : jobsQuery.isError ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(
                jobsQuery.error,
                "Couldn't load your company's jobs.",
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => void jobsQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <h2 className="text-lg font-semibold">No jobs yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first posting to start building a candidate pipeline.
            </p>
            <Link
              to="/recruiter/jobs/create"
              className={cn(
                buttonVariants({ variant: "default" }),
                "mt-5",
              )}
            >
              Create job
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <Card key={job.id} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl leading-7">
                      {job.title}
                    </CardTitle>
                    <Badge
                      variant={job.status === "OPEN" ? "success" : "muted"}
                    >
                      {statusLabels[job.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {job.location ??
                        (job.isRemote ? "Remote" : "Location not specified")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <BriefcaseBusiness
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {employmentTypeLabels[job.employmentType]}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Posted {formatDate(job.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {job.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <UsersRound
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{job.applicantCount}</span>
                    <span className="text-muted-foreground">
                      {job.applicantCount === 1 ? "applicant" : "applicants"}
                    </span>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                    <Link
                      to={`/recruiter/pipeline/${job.id}`}
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "col-span-2",
                      )}
                    >
                      View pipeline
                    </Link>
                    <Link
                      to={`/recruiter/jobs/${job.id}`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      View details
                    </Link>
                    <Link
                      to={`/recruiter/jobs/${job.id}/edit`}
                      className={buttonVariants({ variant: "secondary" })}
                    >
                      Edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </>
  );
}
