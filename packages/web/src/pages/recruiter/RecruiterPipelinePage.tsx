import {
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  useApplicationsByJob,
  useUpdateApplicationStage,
} from "../../features/applications/hooks";
import { useRecruiterJobs } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";
import type {
  RecruiterApplicationStage,
  RecruiterPipelineApplication,
} from "../../types/applications";

const pipelineStages: RecruiterApplicationStage[] = [
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

function stageBadgeVariant(stage: RecruiterApplicationStage) {
  if (stage === "OFFER" || stage === "HIRED") {
    return "success" as const;
  }

  if (stage === "REJECTED") {
    return "muted" as const;
  }

  return "secondary" as const;
}

function PipelineSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading pipeline">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {pipelineStages.map((stage) => (
          <Skeleton key={stage} className="h-24" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-9 w-44" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PipelineJobSelector() {
  const jobsQuery = useRecruiterJobs();
  const jobs = jobsQuery.data ?? [];

  if (jobsQuery.isLoading) {
    return (
      <div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Loading jobs for pipeline"
      >
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-36 rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobsQuery.isError) {
    return (
      <Card role="alert">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div>
            <h2 className="font-semibold">Jobs unavailable</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {getApiErrorMessage(
                jobsQuery.error,
                "Couldn't load the jobs available for pipeline review.",
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void jobsQuery.refetch()}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div>
            <h2 className="font-semibold">Create a job first</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A job gives incoming applications a pipeline to appear in.
            </p>
          </div>
          <Link
            to="/recruiter/jobs/create"
            className={cn(buttonVariants())}
          >
            Create job
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Choose a job</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipelines are scoped to one job so every count and candidate is
          relevant.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id} className="flex h-full flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg">{job.title}</CardTitle>
                <Badge
                  variant={
                    job.status === "OPEN"
                      ? "success"
                      : job.status === "DRAFT"
                        ? "secondary"
                        : "muted"
                  }
                >
                  {job.status === "OPEN"
                    ? "Open"
                    : job.status === "DRAFT"
                      ? "Draft"
                      : "Closed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {job.description}
              </p>
              <Link
                to={`/recruiter/pipeline/${job.id}`}
                className={cn(buttonVariants(), "mt-5 w-full")}
              >
                Open pipeline
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PipelineSummary({
  applications,
}: {
  applications: RecruiterPipelineApplication[];
}) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6"
      aria-label="Pipeline stage counts"
    >
      {pipelineStages.map((stage) => (
        <Card key={stage}>
          <CardContent className="p-4">
            <p className="text-sm font-medium">{stageLabels[stage]}</p>
            <p className="mt-2 text-2xl font-semibold">
              {
                applications.filter(
                  (application) => application.stage === stage,
                ).length
              }
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CandidateCard({
  application,
  onMoveToInterviewing,
  isMoving,
  mutationPending,
}: {
  application: RecruiterPipelineApplication;
  onMoveToInterviewing: (application: RecruiterPipelineApplication) => void;
  isMoving: boolean;
  mutationPending: boolean;
}) {
  const { candidateProfile } = application;
  const { user } = candidateProfile;
  const resumeUrl = application.resumeUrl ?? candidateProfile.resumeUrl;
  const canMoveToInterviewing =
    application.stage === "APPLIED" || application.stage === "REVIEWED";

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{user.name}</CardTitle>
            <a
              href={`mailto:${user.email}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {user.email}
            </a>
          </div>
        </div>
        <Badge variant={stageBadgeVariant(application.stage)}>
          {stageLabels[application.stage]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {candidateProfile.headline && (
            <span>{candidateProfile.headline}</span>
          )}
          {candidateProfile.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {candidateProfile.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Applied{" "}
            {formatDate(application.submittedAt ?? application.createdAt)}
          </span>
        </div>

        {candidateProfile.bio && (
          <p className="text-sm leading-6 text-muted-foreground">
            {candidateProfile.bio}
          </p>
        )}

        {application.coverLetter && (
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Cover letter</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {application.coverLetter}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/recruiter/candidates/${candidateProfile.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View profile
          </Link>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              View resume
            </a>
          )}
          {canMoveToInterviewing && (
            <Button
              type="button"
              size="sm"
              onClick={() => onMoveToInterviewing(application)}
              disabled={mutationPending}
            >
              {isMoving ? "Moving…" : "Move to interviewing"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecruiterPipelinePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const applicationsQuery = useApplicationsByJob(jobId);
  const updateStage = useUpdateApplicationStage();
  const applications = applicationsQuery.data ?? [];

  function moveToInterviewing(application: RecruiterPipelineApplication) {
    if (!jobId) {
      return;
    }

    updateStage.mutate(
      {
        applicationId: application.id,
        jobId,
        stage: "INTERVIEWING",
      },
      {
        onSuccess: () => {
          toast.success(
            `${application.candidateProfile.user.name} moved to interviewing.`,
          );
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              "Couldn't update the application stage.",
            ),
          );
        },
      },
    );
  }

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">
            Recruiter pipeline
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            Review candidates without noise.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            See each candidate’s stage, profile context, and next review action
            at a glance.
          </p>
        </div>

        {!jobId && <PipelineJobSelector />}

        {jobId && applicationsQuery.isLoading && <PipelineSkeleton />}

        {jobId && applicationsQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="font-semibold">Pipeline unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getApiErrorMessage(
                    applicationsQuery.error,
                    "Couldn't load this job's applications.",
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void applicationsQuery.refetch()}
                disabled={applicationsQuery.isFetching}
              >
                {applicationsQuery.isFetching ? "Trying again…" : "Try again"}
              </Button>
            </CardContent>
          </Card>
        )}

        {jobId && applicationsQuery.isSuccess && (
          <div className="space-y-6">
            <PipelineSummary applications={applications} />

            {applications.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold">No applications yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted applications for this job will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {applications.map((application) => (
                  <CandidateCard
                    key={application.id}
                    application={application}
                    onMoveToInterviewing={moveToInterviewing}
                    mutationPending={updateStage.isPending}
                    isMoving={
                      updateStage.isPending &&
                      updateStage.variables?.applicationId === application.id
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
