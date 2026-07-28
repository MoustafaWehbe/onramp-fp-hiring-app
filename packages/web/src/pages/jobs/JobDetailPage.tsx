import { useState } from "react";
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
import {
  useApplyToJob,
  useMyApplications,
} from "../../features/applications/hooks";
import {
  APPLICATION_RESUME_ACCEPT,
  validateApplicationResume,
} from "../../features/applications/resume-files";
import { usePublicJob } from "../../features/jobs/hooks";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api-errors";
import {
  employmentTypeLabels,
  formatSalaryRange,
} from "../../lib/job-presentation";
import { cn, formatDate } from "../../lib/utils";

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
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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

    return (
      <div className="w-full space-y-3 rounded-lg border bg-card p-4 sm:w-80">
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
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  {job.company.name}
                </span>
                <Badge variant="success">Open</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                {job.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {job.location ??
                  (job.isRemote ? "Remote" : "Location not specified")}{" "}
                · Posted{" "}
                {formatDate(job.createdAt)}
              </p>
            </div>
            {applicationAction}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">About this role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {job.description}
            </p>
          </CardContent>
        </Card>

        <aside>
          <Card>
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
