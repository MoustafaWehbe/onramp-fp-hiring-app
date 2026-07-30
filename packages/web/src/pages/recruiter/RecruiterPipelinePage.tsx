import {
  CalendarCheck,
  CalendarDays,
  FileText,
  Loader2,
  Mail,
  MapPin,
  NotebookPen,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { InterviewDetailsForm } from "../../features/applications/components/InterviewDetailsForm";
import {
  useApplicationsByJob,
  useRescoreApplication,
  useUpdateApplicationStage,
} from "../../features/applications/hooks";
import {
  formatInterviewDate,
  fromInterviewDateInput,
  toInterviewDateInput,
} from "../../features/applications/interview-date";
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
  onRescore,
  isMoving,
  isRescoring,
  mutationPending,
}: {
  application: RecruiterPipelineApplication;
  onMoveToInterviewing: (
    application: RecruiterPipelineApplication,
    interviewDate: string | null,
  ) => void;
  onRescore: (application: RecruiterPipelineApplication) => void;
  isMoving: boolean;
  isRescoring: boolean;
  mutationPending: boolean;
}) {
  const { candidateProfile } = application;
  const { user } = candidateProfile;
  const [schedulePromptOpen, setSchedulePromptOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState(() =>
    toInterviewDateInput(application.interviewDate),
  );
  const canMoveToInterviewing =
    application.stage === "APPLIED" || application.stage === "REVIEWED";
  const scoreBadge =
    application.aiScoringStatus === "completed" &&
    application.fitScore !== null ? (
      <Badge
        variant={
          application.fitScore >= 75
            ? "success"
            : application.fitScore >= 50
              ? "secondary"
              : "muted"
        }
      >
        <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        {application.fitScore}% fit
      </Badge>
    ) : application.aiScoringStatus === "pending" ? (
      <Badge variant="outline">
        <Loader2
          className="mr-1 h-3.5 w-3.5 animate-spin"
          aria-hidden="true"
        />
        Scoring
      </Badge>
    ) : (
      <Badge variant="muted">Not yet scored</Badge>
    );

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {scoreBadge}
          {/* Only candidates with a scheduled interview carry this badge. */}
          {application.interviewDate && (
            <Badge
              variant="outline"
              title={`Interview scheduled for ${formatInterviewDate(
                application.interviewDate,
              )}`}
            >
              <CalendarCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Interview {formatInterviewDate(application.interviewDate)}
            </Badge>
          )}
          <Badge variant={stageBadgeVariant(application.stage)}>
            {stageLabels[application.stage]}
          </Badge>
        </div>
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
          {application.resumeDownloadUrl && (
            <a
              href={application.resumeDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              View CV
            </a>
          )}
          {canMoveToInterviewing && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                // Re-read the stored date on open so the prompt cannot
                // confirm a value that was changed in the notes panel.
                setScheduleValue(toInterviewDateInput(application.interviewDate));
                setSchedulePromptOpen((open) => !open);
              }}
              disabled={mutationPending}
            >
              {isMoving ? "Moving…" : "Move to interviewing"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
          >
            <NotebookPen className="mr-2 h-4 w-4" aria-hidden="true" />
            {detailsOpen ? "Hide notes" : "Notes & interview date"}
          </Button>
          {application.aiScoringStatus === "failed" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRescore(application)}
              disabled={mutationPending}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  isRescoring ? "animate-spin" : ""
                }`}
                aria-hidden="true"
              />
              {isRescoring ? "Queuing…" : "Rescore"}
            </Button>
          )}
        </div>

        {schedulePromptOpen && canMoveToInterviewing && (
          <div className="rounded-md border bg-muted/30 p-4">
            <Label htmlFor={`schedule-${application.id}`}>
              Interview date (optional)
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Leave it empty to move {user.name} now and schedule later.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                id={`schedule-${application.id}`}
                type="datetime-local"
                className="w-auto"
                value={scheduleValue}
                onChange={(event) => setScheduleValue(event.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={mutationPending}
                onClick={() => {
                  onMoveToInterviewing(
                    application,
                    fromInterviewDateInput(scheduleValue),
                  );
                  setSchedulePromptOpen(false);
                }}
              >
                {isMoving ? "Moving…" : "Confirm move"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScheduleValue(
                    toInterviewDateInput(application.interviewDate),
                  );
                  setSchedulePromptOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {detailsOpen && (
          <div className="rounded-md border bg-muted/30 p-4">
            <InterviewDetailsForm
              applicationId={application.id}
              jobId={application.jobId}
              candidateProfileId={application.candidateProfileId}
              interviewDate={application.interviewDate}
              recruiterNotes={application.recruiterNotes}
              interviewScheduledAt={application.interviewScheduledAt}
            />
          </div>
        )}

        {!detailsOpen && application.recruiterNotes && (
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium">Recruiter notes</p>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {application.recruiterNotes}
            </p>
          </div>
        )}

        {application.resumeOriginalFilename && (
          <div className="text-xs text-muted-foreground">
            <p>
              CV: {application.resumeOriginalFilename}
              {application.resumeUploadedAt
                ? ` · uploaded ${formatDate(application.resumeUploadedAt)}`
                : ""}
            </p>
            {application.resumeParseSucceeded === false && (
              <p className="mt-1 text-amber-700">
                The file is available, but text extraction was unsuccessful.
              </p>
            )}
            {application.parsedYearsExperience != null && (
              <p className="mt-1">
                Parsed experience: {application.parsedYearsExperience} years
              </p>
            )}
            {(application.parsedSkills?.length ?? 0) > 0 && (
              <p className="mt-1">
                Parsed skills: {application.parsedSkills?.join(", ")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecruiterPipelinePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [minimumFitScore, setMinimumFitScore] = useState(0);
  const applicationsQuery = useApplicationsByJob(jobId);
  const updateStage = useUpdateApplicationStage();
  const rescoreApplication = useRescoreApplication();
  const applications = applicationsQuery.data ?? [];
  const visibleApplications = useMemo(
    () =>
      [...applications]
        .sort((left, right) => {
          const leftScore = left.fitScore ?? -1;
          const rightScore = right.fitScore ?? -1;
          return rightScore - leftScore;
        })
        .filter(
          (application) =>
            minimumFitScore === 0 ||
            (application.aiScoringStatus === "completed" &&
              application.fitScore !== null &&
              application.fitScore >= minimumFitScore),
        ),
    [applications, minimumFitScore],
  );

  function moveToInterviewing(
    application: RecruiterPipelineApplication,
    interviewDate: string | null,
  ) {
    if (!jobId) {
      return;
    }

    updateStage.mutate(
      {
        applicationId: application.id,
        jobId,
        stage: "INTERVIEWING",
        // A skipped prompt leaves the date untouched rather than clearing it,
        // so the transition never depends on one being chosen.
        ...(interviewDate === (application.interviewDate ?? null)
          ? {}
          : { interviewDate }),
      },
      {
        onSuccess: () => {
          toast.success(
            interviewDate
              ? `${application.candidateProfile.user.name} moved to interviewing for ${formatInterviewDate(interviewDate)}.`
              : `${application.candidateProfile.user.name} moved to interviewing.`,
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

  function rescore(application: RecruiterPipelineApplication) {
    if (!jobId) {
      return;
    }

    rescoreApplication.mutate(
      {
        applicationId: application.id,
        jobId,
      },
      {
        onSuccess: () => {
          toast.success(
            `${application.candidateProfile.user.name}'s fit score was queued.`,
          );
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              "Couldn't queue this application for scoring.",
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
              <>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="w-full max-w-xs space-y-2">
                      <Label htmlFor="minimum-fit-score">
                        Minimum fit score
                      </Label>
                      <Input
                        id="minimum-fit-score"
                        type="number"
                        min={0}
                        max={100}
                        value={minimumFitScore}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          setMinimumFitScore(
                            Number.isFinite(nextValue)
                              ? Math.min(100, Math.max(0, nextValue))
                              : 0,
                          );
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Showing {visibleApplications.length} of{" "}
                      {applications.length} candidates, highest fit first.
                    </p>
                  </CardContent>
                </Card>

                {visibleApplications.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="font-semibold">
                        No candidates meet this threshold
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Lower the minimum fit score to include more candidates.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {visibleApplications.map((application) => (
                      <CandidateCard
                        key={application.id}
                        application={application}
                        onMoveToInterviewing={moveToInterviewing}
                        onRescore={rescore}
                        mutationPending={
                          updateStage.isPending ||
                          rescoreApplication.isPending
                        }
                        isMoving={
                          updateStage.isPending &&
                          updateStage.variables?.applicationId ===
                            application.id
                        }
                        isRescoring={
                          rescoreApplication.isPending &&
                          rescoreApplication.variables?.applicationId ===
                            application.id
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
