import { Lock, RefreshCw, X } from "lucide-react";
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
import { PipelineBoardSkeleton } from "../../features/applications/components/PipelineBoardSkeleton";
import type { PipelineTalentPoolMark } from "../../features/applications/components/PipelineCard";
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
import { useCalendarConnection } from "../../features/calendar/hooks";
import { useCompanyProfile } from "../../features/company/hooks";
import { useRecruiterCandidates } from "../../features/recruiter/hooks";
import { useFullBleedContent } from "../../layouts/full-bleed";
import { useRealtime } from "../../providers/RealtimeProvider";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type {
  RecruiterMutableApplicationStage,
  RecruiterPipelineApplication,
} from "../../types/applications";
// add to imports
import { TEXT_WARNING, WARNING_BANNER } from "../../features/candidate/theme";
import { SuccessMoment } from "../../components/shared/SuccessMoment";

/**
 * The board spans the full shell width (see `useFullBleedContent` below), so
 * everything around it re-applies the measure the rest of the app reads at.
 * Only the columns want a 2560px monitor; a fit-score filter does not.
 */
const PAGE_MEASURE_CLASS = "mx-auto w-full max-w-7xl";

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
  const connectionQuery = useCalendarConnection();
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
          {connectionQuery.data && (
            <p className="text-xs text-muted-foreground">
              {connectionQuery.data.connected
                ? `Google Calendar and Meet will sync from ${connectionQuery.data.googleEmail}.`
                : "The date will save without Google Calendar sync. Connect it in Settings to add Meet."}
            </p>
          )}
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
                onSuccess: (updated) => {
                  if (updated.calendarSyncStatus === "synced") {
                    toast.success("Interview saved and synced to Google Calendar.");
                  } else if (updated.calendarSyncStatus === "failed") {
                    toast.warning(
                      "Interview saved, but Google Calendar sync failed.",
                    );
                  } else {
                    toast.success("Interview date saved without calendar sync.");
                  }
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
  const [justHired, setJustHired] = useState<string | null>(null);
  const applicationsQuery = useApplicationsByJob(jobId);
  const updateStage = useUpdateApplicationStage();
  const rescoreApplication = useRescoreApplication();
  const companyQuery = useCompanyProfile();
  const isPro = companyQuery.data?.subscriptionTier === "PRO";
  const { isDegraded } = useRealtime();
  const applications = useMemo(
    () => applicationsQuery.data ?? [],
    [applicationsQuery.data],
  );

  // Six columns of cards are the one recruiter surface worth the whole
  // viewport. Only while a board is actually on screen — the job selector is
  // a normal three-up card grid and reads better at the shared measure.
  useFullBleedContent(Boolean(jobId));

  /*
   * Talent-pool markers. The pipeline endpoint carries the application and its
   * candidate profile but not pool membership, which is a recruiter-scoped
   * relation on the candidate — so rather than widen that response, the board
   * joins the two client-side on candidate profile id.
   *
   * Scoped to `poolStatus: "in_pool"` so the request returns only the
   * candidates that could produce a marker, and gated on `isPro` because the
   * listing is Pro-only server-side: a Free company would get a guaranteed
   * 403, exactly as RecruiterCandidatesPage avoids.
   */
  const poolQuery = useRecruiterCandidates(
    { poolStatus: "in_pool" },
    { enabled: isPro && Boolean(jobId) },
  );

  const talentPoolByProfileId = useMemo(() => {
    const marks = new Map<string, PipelineTalentPoolMark>();

    for (const candidate of poolQuery.data ?? []) {
      if (candidate.poolEntry) {
        marks.set(candidate.id, {
          tagLabels: candidate.poolEntry.tags.map((tag) => tag.label),
        });
      }
    }

    return marks;
  }, [poolQuery.data]);

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

          // The one deliberate celebratory moment on this page — a hire is
          // the outcome the whole pipeline exists to produce.
          if (stage === "HIRED") {
            setJustHired(name);
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
    <>
      <div className={cn(PAGE_MEASURE_CLASS, "mb-8")}>
          <p className="text-sm font-medium text-primary">Recruiter pipeline</p>
          <h1 className="mt-2 text-4xl font-bold">
            Move candidates, not spreadsheets.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Drag a candidate between stages. Changes save immediately and
            appear for everyone else on the job.
          </p>
        </div>

        {!jobId && (
          <div className={PAGE_MEASURE_CLASS}>
            <PipelineJobSelector />
          </div>
        )}

        {jobId && applicationsQuery.isLoading && <PipelineBoardSkeleton />}

        {jobId && applicationsQuery.isError && (
          <Card role="alert" className={PAGE_MEASURE_CLASS}>
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
            {justHired && (
              <div className={PAGE_MEASURE_CLASS}>
                <SuccessMoment
                  message={`${justHired} was hired!`}
                  onDismiss={() => setJustHired(null)}
                />
              </div>
            )}

            {isDegraded && (
  <Card className={cn(WARNING_BANNER, PAGE_MEASURE_CLASS)} role="status">
    <CardContent className={cn("p-4 text-sm", TEXT_WARNING)}>
                  Live updates are reconnecting. Moves you make still save, but
                  changes from other sessions may not appear until the
                  connection is back.
                </CardContent>
              </Card>
            )}

            {applications.length === 0 ? (
              <Card className={PAGE_MEASURE_CLASS}>
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
                  <div className={PAGE_MEASURE_CLASS}>
                    <SchedulePrompt
                      application={scheduleApplication}
                      jobId={jobId}
                      onDismiss={() => setScheduleFor(null)}
                    />
                  </div>
                )}

                <Card className={PAGE_MEASURE_CLASS}>
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
                      {unscored.length > 0 && isPro && (
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
                      {unscored.length > 0 && !isPro && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled
                          title="AI rescoring requires a Pro subscription. Upgrade to unlock it."
                        >
                          <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                          Rescore {unscored.length} unscored
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {visibleApplications.length === 0 ? (
                  <Card className={PAGE_MEASURE_CLASS}>
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
                    isPro={isPro}
                    talentPoolByProfileId={talentPoolByProfileId}
                    onMove={moveToStage}
                    onRefuse={(message) => toast.error(message)}
                  />
                )}
              </>
            )}
          </div>
        )}
    </>
  );
}
