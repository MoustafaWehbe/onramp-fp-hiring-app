import { isAxiosError } from "axios";
import {
  BriefcaseBusiness,
  CalendarDays,
  DollarSign,
  Laptop,
  MapPin,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useRecruiterJob } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import {
  employmentTypeLabels,
  formatSalaryRange,
} from "../../lib/job-presentation";
import { cn, formatDate } from "../../lib/utils";
import type { RecruiterJobStatus } from "../../types/jobs";

const statusLabels: Record<RecruiterJobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

function statusVariant(status: RecruiterJobStatus) {
  return status === "OPEN" ? ("success" as const) : ("muted" as const);
}

function JobDetailsSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading job details">
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-8 w-3/5" />
          <Skeleton className="h-5 w-1/3" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

export function RecruiterJobDetailsPage() {
  const { id } = useParams();
  const jobQuery = useRecruiterJob(id);
  const jobNotFound =
    isAxiosError(jobQuery.error) &&
    jobQuery.error.response?.status === 404;

  return (
    <>
      <div className="mb-6">
          <Link
            to="/recruiter/jobs"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "px-0 hover:bg-transparent",
            )}
          >
            Back to jobs
          </Link>
        </div>

        {jobQuery.isLoading ? (
          <JobDetailsSkeleton />
        ) : jobNotFound ? (
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <CardTitle>Job not found</CardTitle>
              <p className="text-sm text-muted-foreground">
                This job may not exist or may belong to another company.
              </p>
              <Link
                to="/recruiter/jobs"
                className={buttonVariants({ variant: "outline" })}
              >
                View your jobs
              </Link>
            </CardContent>
          </Card>
        ) : jobQuery.isError || !jobQuery.data ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(
                  jobQuery.error,
                  "Couldn't load this job.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void jobQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle className="text-3xl">
                        {jobQuery.data.title}
                      </CardTitle>
                      <Badge variant={statusVariant(jobQuery.data.status)}>
                        {statusLabels[jobQuery.data.status]}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Posted {formatDate(jobQuery.data.createdAt)} · Updated{" "}
                      {formatDate(jobQuery.data.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/recruiter/jobs/${jobQuery.data.id}/edit`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Edit job
                    </Link>
                    <Link
                      to={`/recruiter/pipeline/${jobQuery.data.id}`}
                      className={buttonVariants({ variant: "default" })}
                    >
                      View pipeline
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <BriefcaseBusiness
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Employment
                    </p>
                    <p className="font-medium">
                      {employmentTypeLabels[jobQuery.data.employmentType]}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <MapPin
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Location
                    </p>
                    <p className="font-medium">
                      {jobQuery.data.location ?? "Not specified"}
                    </p>
                    {jobQuery.data.isRemote && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
                        Remote available
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <DollarSign
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm text-muted-foreground">Salary</p>
                    <p className="font-medium">
                      {formatSalaryRange(jobQuery.data)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <UsersRound
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      Applicants
                    </p>
                    <p className="font-medium">
                      {jobQuery.data.applicantCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Job description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {jobQuery.data.description}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Experience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="inline-flex items-center gap-2 text-sm">
                      <CalendarDays
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      {jobQuery.data.experienceMin}–{jobQuery.data.experienceMax}{" "}
                      years
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">Required skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobQuery.data.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {jobQuery.data.skills.map((skill) => (
                          <Badge key={skill.id} variant="secondary">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No skills added.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
