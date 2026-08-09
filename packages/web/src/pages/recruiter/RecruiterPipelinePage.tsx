import { RefreshCw, X } from "lucide-react";
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
import { PipelineBoard } from "../../features/applications/components/PipelineBoard";
import { stageLabels } from "../../features/applications/components/pipeline-board";
import {
  useApplicationsByJob,
  useRescoreApplication,
  useUpdateApplicationInterview,
  useUpdateApplicationStage,
} from "../../features/applications/hooks";
import {
  fromInterviewDateInput,
  toInterviewDateInput,
} from "../../features/applications/interview-date";
import { useRecruiterJobs } from "../../features/jobs/hooks";
import { useRealtime } from "../../providers/RealtimeProvider";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type {
  RecruiterMutableApplicationStage,
  RecruiterPipelineApplication,
} from "../../types/applications";
// add to imports
import { TEXT_WARNING, WARNING_BANNER } from "../../features/candidate/theme";
function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-label="Loading pipeline">
      {[0, 1, 2, 3, 4, 5].map((column) => (
        <Skeleton key={column} className="h-80 w-72 shrink-0 rounded-lg" />
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
          <Link to="/recruiter/jobs/create" className={cn(buttonVariants())}>
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

/**
 * Phase 3's "set a date when you move someone to interviewing" prompt, kept
 * alive after the drag rather than before it — the move already succeeded, so
 * scheduling stays genuinely optional.
 */
function SchedulePrompt({
  application,
  jobId,
  onDismiss,
}: {
  application: RecruiterPipelineApplication;
  jobId: string;
  onDismiss: () => void;
}) {
  const updateInterview = useUpdateApplicationInterview();
  const [value, setValue] = useState(() =>
    toInterviewDateInput(application.interviewDate),
  );

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label htmlFor="drag-interview-date">
            {application.candidateProfile.user.name} moved to interviewing —
            set a date?
          </Label>
          <Input
            id="drag-interview-date"
            type="datetime-local"
            className="w-auto"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!value || updateInterview.isPending}
          onClick={() =>
            updateInterview.mutate(
              {
                applicationId: application.id,
                jobId,
                candidateProfileId: application.candidateProfileId,
                interviewDate: fromInterviewDateInput(value),
              },
              {
                onSuccess: () => {
                  toast.success("Interview date saved.");
                  onDismiss();
                },
                onError: (error) => {
                  toast.error(
                    getApiErrorMessage(
                      error,
                      "Couldn't save the interview date.",
                    ),
                  );
                },
              },
            )
          }
        >
          {updateInterview.isPending ? "Saving…" : "Save date"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Later
        </Button>
      </CardContent>
    </Card>
  );
}

export function RecruiterPipelinePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [minimumFitScore, setMinimumFitScore] = useState(0);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const applicationsQuery = useApplicationsByJob(jobId);
  const updateStage = useUpdateApplicationStage();
  const rescoreApplication = useRescoreApplication();
  const { isDegraded } = useRealtime();
  const applications = useMemo(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data],
  );

  const visibleApplications = useMemo(
    () =>
      applications.filter(
        (application) =>
          minimumFitScore === 0 ||
          (application.aiScoringStatus === "completed" &&
            application.fitScore !== null &&
            application.fitScore >= minimumFitScore),
      ),
    [applications, minimumFitScore],
  );

  const unscored = applications.filter(
    (application) => application.aiScoringStatus === "failed",
  );
  const scheduleApplication = scheduleFor
    ? applications.find((application) => application.id === scheduleFor)
    : undefined;

  function moveToStage(
    application: RecruiterPipelineApplication,
    stage: RecruiterMutableApplicationStage,
  ) {
    if (!jobId) {
      return;
    }

    const name = application.candidateProfile.user.name;

    updateStage.mutate(
      { applicationId: application.id, jobId, stage },
      {
        onSuccess: () => {
          toast.success(`${name} moved to ${stageLabels[stage].toLowerCase()}.`);

          // Only offer scheduling when there is nothing scheduled yet.
          if (stage === "INTERVIEWING" && !application.interviewDate) {
            setScheduleFor(application.id);
          }
        },
        onError: (error) => {
          // The optimistic card has already been rolled back by the mutation;
          // this explains why it snapped back.
          toast.error(
            getApiErrorMessage(
              error,
              "Couldn't move this candidate. The board has been restored.",
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
      { applicationId: application.id, jobId },
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
          <p className="text-sm font-medium text-primary">Recruiter pipeline</p>
          <h1 className="mt-2 text-4xl font-bold">
            Move candidates, not spreadsheets.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Drag a candidate between stages. Changes save immediately and
            appear for everyone else on the job.
          </p>
        </div>

        {!jobId && <PipelineJobSelector />}

        {jobId && applicationsQuery.isLoading && <BoardSkeleton />}

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
          <div className="space-y-4">
            {isDegraded && (
  <Card className={WARNING_BANNER} role="status">
    <CardContent className={cn("p-4 text-sm", TEXT_WARNING)}>
                  Live updates are reconnecting. Moves you make still save, but
                  changes from other sessions may not appear until the
                  connection is back.
                </CardContent>
              </Card>
            )}

            {applications.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <h2 className="font-semibold">No applications yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted applications for this job will appear on the
                    board.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {scheduleApplication && jobId && (
                  <SchedulePrompt
                    application={scheduleApplication}
                    jobId={jobId}
                    onDismiss={() => setScheduleFor(null)}
                  />
                )}

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
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        Showing {visibleApplications.length} of{" "}
                        {applications.length} candidates.
                      </p>
                      {unscored.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={rescoreApplication.isPending}
                          onClick={() => unscored.forEach(rescore)}
                        >
                          <RefreshCw
                            className={cn(
                              "mr-2 h-4 w-4",
                              rescoreApplication.isPending && "animate-spin",
                            )}
                            aria-hidden="true"
                          />
                          Rescore {unscored.length} unscored
                        </Button>
                      )}
                    </div>
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
                  <PipelineBoard
                    applications={visibleApplications}
                    movingApplicationId={
                      updateStage.isPending
                        ? updateStage.variables?.applicationId
                        : undefined
                    }
                    onMove={moveToStage}
                    onRefuse={(message) => toast.error(message)}
                  />
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
