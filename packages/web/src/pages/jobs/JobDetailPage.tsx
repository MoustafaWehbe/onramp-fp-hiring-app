import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarRange,
  DollarSign,
  ExternalLink,
  FileUp,
  Laptop,
  MapPin,
  TriangleAlert,
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
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { SuccessMoment } from "../../components/shared/SuccessMoment";
import {
  ACCENT_TEXT,
  CARD_CLASS,
  TEXT_META,
  TEXT_WARNING,
  WARNING_BANNER,
} from "../../features/candidate/theme";
import {
  useApplicationPercentile,
  useApplyToJob,
  useMyApplications,
} from "../../features/applications/hooks";
import {
  APPLICATION_RESUME_ACCEPT,
  validateApplicationResume,
} from "../../features/applications/resume-files";
import { ResumeAIReview } from "../../features/applications/components/ResumeAIReview";
import { ApplicationPercentile } from "../../features/applications/components/ApplicationPercentile";
import { usePublicJob } from "../../features/jobs/hooks";
import { useAuth } from "../../hooks/useAuth";
import { EasyApplyButton } from "../../features/candidate/components/EasyApplyButton";
import { getApiErrorMessage } from "../../lib/api-errors";
import {
  employmentTypeLabels,
  formatSalaryRange,
} from "../../lib/job-presentation";
import { cn, formatDate } from "../../lib/utils";
import type { ResumeReviewResult } from "../../types/candidate";

function BackToJobsLink() {
  return (
    <Link to="/jobs" className={cn(buttonVariants(), "mt-6 gap-2")}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to jobs
    </Link>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-20 w-full max-w-3xl" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function JobDetailPage() {
  const { jobId } = useParams();
  const { user, currentRole, isLoading: isAuthLoading } = useAuth();
  const jobQuery = usePublicJob(jobId);
  const isCandidate = currentRole === "candidate";
  const applicationsQuery = useMyApplications(
    Boolean(user && isCandidate),
  );
  const applyToJob = useApplyToJob();
  const applicationPercentile = useApplicationPercentile();
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [justApplied, setJustApplied] = useState(false);
  const [resumeReview, setResumeReview] = useState<ResumeReviewResult | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [acknowledgedReviewWarning, setAcknowledgedReviewWarning] = useState(false);

  // A fresh job (and a fresh CV upload) means a stale review no longer
  // applies — the review is deliberately never persisted, so leaving this
  // page (or switching jobs on it) is exactly when it should be discarded.
  // The percentile mutation is reset alongside it for the same reason: it's
  // keyed to a specific application on this job, not something to carry
  // across a job switch.
  useEffect(() => {
    setResumeReview(null);
    setHasReviewed(false);
    setAcknowledgedReviewWarning(false);
    applicationPercentile.reset();
  }, [jobId]);

  if (jobQuery.isLoading) {
    return <JobDetailSkeleton />;
  }

  const jobNotFound =
    isAxiosError(jobQuery.error) && jobQuery.error.response?.status === 404;

  if (jobNotFound || !jobQuery.data) {
    if (jobQuery.isError && !jobNotFound) {
      return (
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <h1 className="text-3xl font-bold">We couldn't load this role</h1>
          <p className="mt-3 text-muted-foreground" role="alert">
            {getApiErrorMessage(
              jobQuery.error,
              "Something went wrong while loading this role.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void jobQuery.refetch()}
            >
              Try again
            </Button>
            <Link to="/jobs" className={buttonVariants()}>
              Back to jobs
            </Link>
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold">Role not found</h1>
        <p className="mt-3 text-muted-foreground">
          This role may have moved or closed.
        </p>
        <BackToJobsLink />
      </section>
    );
  }

  const job = jobQuery.data;
  const existingApplication = applicationsQuery.data?.find(
    (application) => application.jobId === job.id,
  );
  const hasDraft = existingApplication?.stage === "DRAFT";
  const alreadyApplied =
    (existingApplication !== undefined && !hasDraft) ||
    applyToJob.data?.jobId === job.id ||
    duplicateJobId === job.id;

  // Gated only on a review the candidate actually ran and that flagged real
  // gaps — a candidate who never clicked "Review with AI" sees no warning
  // and applies exactly as before.
  const reviewFlaggedIssues = hasReviewed && (resumeReview?.cons.length ?? 0) > 0;
  const blockingReviewWarning = reviewFlaggedIssues && !acknowledgedReviewWarning;

  async function handleApply() {
    if (resumeFile) {
      const validationError = validateApplicationResume(resumeFile);
      if (validationError) {
        setResumeError(validationError);
        return;
      }
    }

    setResumeError(null);
    setUploadProgress(0);

    try {
      const application = await applyToJob.mutateAsync({
        jobId: job.id,
        ...(resumeFile ? { resumeFile } : {}),
        onUploadProgress: setUploadProgress,
      });

      if (resumeFile && application.resumeParseSucceeded === false) {
        toast.warning(
          "Application submitted. Your CV was stored, but its text couldn't be parsed.",
        );
      } else {
        toast.success(
          hasDraft ? "Draft application submitted" : "Application submitted",
        );
      }
      setResumeFile(null);
      setJustApplied(true);
      applicationPercentile.mutate(application.id);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setDuplicateJobId(job.id);
        void applicationsQuery.refetch();
        toast.info("You've already applied to this role.");
        return;
      }

      toast.error(
        getApiErrorMessage(error, "Couldn't submit your application."),
      );
    }
  }

  const applicationAction = (() => {
    if (isAuthLoading) {
      return <Skeleton className="h-10 w-36" />;
    }

    if (!user) {
      return (
        <Link
          to="/login?role=candidate"
          state={{ returnTo: `/jobs/${job.id}` }}
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          Sign in to apply
        </Link>
      );
    }

    if (!isCandidate) {
      return null;
    }

    const isCheckingApplications = applicationsQuery.isLoading;
    const isApplyingToThisJob =
      applyToJob.isPending && applyToJob.variables?.jobId === job.id;

    if (alreadyApplied) {
      return (
        <Button type="button" className="w-full sm:w-auto" disabled>
          Already applied
        </Button>
      );
    }

    if (blockingReviewWarning) {
      const issueCount = resumeReview?.cons.length ?? 0;
      return (
        <div
          className={cn(
            "w-full space-y-3 rounded-lg border p-4 sm:w-80",
            WARNING_BANNER,
          )}
        >
          <p className={cn("flex items-center gap-2 text-sm font-semibold", TEXT_WARNING)}>
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            Your AI review found {issueCount} {issueCount === 1 ? "gap" : "gaps"}
          </p>
          <p className={cn("text-sm", TEXT_WARNING)}>
            Worth a look before you apply — see the gaps and suggestions in the
            AI Resume Review panel. You can fix them first, or apply anyway.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setAcknowledgedReviewWarning(true)}
          >
            Apply anyway
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full space-y-3 rounded-lg border bg-card p-4 sm:w-80">
        {/* Applying from the standing profile is the default path; it renders
            itself as a prompt to finish the profile when there is nothing to
            send. Uploading a CV for this specific job stays available below. */}
        <EasyApplyButton
          jobId={job.id}
          className="w-full"
          disabled={isCheckingApplications || isApplyingToThisJob}
          onApplied={(application) => {
            void applicationsQuery.refetch();
            setJustApplied(true);
            applicationPercentile.mutate(application.id);
          }}
        />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            or attach a CV
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        <div>
          <Label htmlFor="application-resume">CV for this application</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF or DOCX, up to 5MB. Existing policy allows applying without a
            new CV.
          </p>
        </div>
        <Input
          id="application-resume"
          type="file"
          accept={APPLICATION_RESUME_ACCEPT}
          disabled={isCheckingApplications || isApplyingToThisJob}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            const validationError = file
              ? validateApplicationResume(file)
              : null;
            setResumeFile(validationError ? null : file);
            setResumeError(validationError);
            setUploadProgress(0);
            if (validationError) {
              event.target.value = "";
            }
          }}
        />
        {resumeFile && (
          <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
            <FileUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{resumeFile.name}</span>
          </p>
        )}
        {resumeError && (
          <p className="text-xs text-destructive" role="alert">
            {resumeError}
          </p>
        )}
        {isApplyingToThisJob && resumeFile && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading CV</span>
              <span>{uploadProgress}%</span>
            </div>
            <progress
              className="h-2 w-full accent-primary"
              max={100}
              value={uploadProgress}
              aria-label="CV upload progress"
            />
          </div>
        )}
        <Button
          type="button"
          className="w-full"
          disabled={isCheckingApplications || isApplyingToThisJob}
          onClick={() => void handleApply()}
        >
          {isCheckingApplications
            ? "Checking..."
            : isApplyingToThisJob
              ? hasDraft
                ? "Submitting..."
                : "Applying..."
              : hasDraft
                ? "Submit application"
                : "Apply"}
        </Button>
      </div>
    );
  })();

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to jobs
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/careers/${job.company.id}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-sm text-sm font-semibold uppercase tracking-wide outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    ACCENT_TEXT,
                  )}
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {job.company.name}
                </Link>
                <Badge variant="success">Open</Badge>
              </div>
              <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {job.title}
              </h1>
              <div className={cn("mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", TEXT_META)}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {job.location ??
                    (job.isRemote ? "Remote" : "Location not specified")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Posted {formatDate(job.createdAt)}
                </span>
              </div>
            </div>
            {applicationAction}
          </div>
          {justApplied && (
            <SuccessMoment
              message={
                hasDraft ? "Draft application submitted!" : "Application submitted!"
              }
              onDismiss={() => setJustApplied(false)}
              className="mt-6 sm:max-w-md sm:self-end"
            />
          )}
          {/* Deliberately not gated on justApplied: the success toast fades
              after a few seconds, but this can take up to ~30s to resolve —
              tying its visibility to the toast's timer would hide the
              result before it ever arrives. It renders nothing on its own
              (idle mutation) until an apply actually triggers it. */}
          <ApplicationPercentile
            isPending={applicationPercentile.isPending}
            percentile={
              applicationPercentile.data?.available
                ? applicationPercentile.data.percentile
                : undefined
            }
            className="mt-3 sm:self-end"
          />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-xl">About this role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {job.description}
            </p>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          {user && isCandidate && (
            <ResumeAIReview
              jobId={job.id}
              resumeFile={resumeFile}
              onResult={(result) => {
                setResumeReview(result);
                setHasReviewed(true);
                setAcknowledgedReviewWarning(false);
              }}
            />
          )}

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-lg">Role snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {job.location ??
                    (job.isRemote ? "Remote" : "Location not specified")}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{employmentTypeLabels[job.employmentType]}</span>
              </div>
              {job.isRemote && (
                <div className="flex items-start gap-3">
                  <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>Remote available</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {job.experienceMin}–{job.experienceMax} years experience
                </span>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{formatSalaryRange(job)}</span>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Posted {formatDate(job.createdAt)}</span>
              </div>
              {/* The careers page is the other way into this company's funnel;
                  the header company name links there too, but a candidate
                  reading the snapshot shouldn't have to scroll back up. */}
              <Link
                to={`/careers/${job.company.id}`}
                className="flex items-start gap-3 font-medium text-primary hover:underline"
              >
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                View all open roles at {job.company.name}
              </Link>
              {job.company.website && (
                <a
                  href={job.company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 font-medium text-primary hover:underline"
                >
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                  Visit {job.company.name}
                </a>
              )}
              <div className="border-t pt-4">
                <p className="mb-2 font-medium">Skills</p>
                {job.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <Badge key={skill.id} variant="outline">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No specific skills listed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
