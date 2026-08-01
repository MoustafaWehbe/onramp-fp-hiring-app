import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  useMyApplications,
  useReplaceApplicationResume,
} from "../../features/applications/hooks";
import {
  APPLICATION_RESUME_ACCEPT,
  validateApplicationResume,
} from "../../features/applications/resume-files";
import type {
  ApplicationStage,
  CandidateApplication,
} from "../../types/applications";
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
import { ApplicationTimeline } from "../../features/candidate/components/ApplicationTimeline";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";

interface StagePresentation {
  label: string;
  icon: LucideIcon;
}

const stagePresentation: Record<ApplicationStage, StagePresentation> = {
  DRAFT: { label: "Draft", icon: Clock3 },
  APPLIED: { label: "Applied", icon: FileCheck2 },
  REVIEWED: { label: "In review", icon: Search },
  INTERVIEWING: { label: "Interviewing", icon: CalendarDays },
  OFFER: { label: "Offer", icon: CheckCircle2 },
  HIRED: { label: "Hired", icon: CheckCircle2 },
  REJECTED: { label: "Not selected", icon: XCircle },
};

function ApplicationListSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Loading applications">
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="flex gap-4 p-5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="hidden h-6 w-20 sm:block" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApplicationCard({
  application,
}: {
  application: CandidateApplication;
}) {
  const stage = stagePresentation[application.stage];
  const Icon = stage.icon;
  const activityDate = application.submittedAt ?? application.updatedAt;
  const activityLabel =
    application.stage === "DRAFT" ? "Saved" : "Submitted";
  const replaceResume = useReplaceApplicationResume();
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputKey, setInputKey] = useState(0);

  async function handleReplaceResume() {
    if (!replacementFile) {
      setFileError("Choose a PDF or DOCX file.");
      return;
    }

    const validationError = validateApplicationResume(replacementFile);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError(null);
    setUploadProgress(0);

    try {
      const updated = await replaceResume.mutateAsync({
        applicationId: application.id,
        file: replacementFile,
        onUploadProgress: setUploadProgress,
      });

      if (updated.resumeParseSucceeded === false) {
        toast.warning(
          "CV replaced, but its text couldn't be parsed. The file is still available.",
        );
      } else {
        toast.success("Application CV replaced");
      }
      setReplacementFile(null);
      setInputKey((value) => value + 1);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Couldn't replace this application CV."),
      );
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-card text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              {application.job.company.name}
            </p>
            <h2 className="text-lg font-semibold">{application.job.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activityLabel} {formatDate(activityDate)}
              {application.job.location
                ? ` · ${application.job.location}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {application.job.status === "CLOSED" && (
            <Badge variant="outline">Job closed</Badge>
          )}
          <Badge
            variant={
              application.stage === "HIRED" ||
              application.stage === "OFFER"
                ? "success"
                : application.stage === "REJECTED"
                  ? "muted"
                  : "secondary"
            }
          >
            {stage.label}
          </Badge>
        </div>

        <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Application CV</p>
            {application.resumeOriginalFilename &&
            application.resumeDownloadUrl ? (
              <div className="mt-2 space-y-2">
                <a
                  href={application.resumeDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {application.resumeOriginalFilename}
                  </span>
                </a>
                <p className="text-xs text-muted-foreground">
                  Uploaded{" "}
                  {application.resumeUploadedAt
                    ? formatDate(application.resumeUploadedAt)
                    : "recently"}
                </p>
                {application.resumeParseSucceeded === false && (
                  <p className="text-xs text-amber-700" role="status">
                    This CV is stored, but its text could not be parsed.
                  </p>
                )}
                {application.parsedYearsExperience != null && (
                  <p className="text-xs text-muted-foreground">
                    Parsed experience: {application.parsedYearsExperience} years
                  </p>
                )}
                {(application.parsedSkills?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {application.parsedSkills?.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No application-specific CV attached.
              </p>
            )}
          </div>

          {/* Stage progression only. The timeline endpoint withholds fit
              score, AI summary, and recruiter notes, and the component has no
              way to render them. A DRAFT has not been submitted, so there is
              nothing to show yet. */}
          {application.stage !== "DRAFT" && (
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-sm font-medium">Progress</p>
              <div className="mt-3">
                <ApplicationTimeline applicationId={application.id} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`replace-resume-${application.id}`}>
              {application.resumeOriginalFilename ? "Replace CV" : "Add CV"}
            </Label>
            <Input
              key={inputKey}
              id={`replace-resume-${application.id}`}
              type="file"
              accept={APPLICATION_RESUME_ACCEPT}
              disabled={replaceResume.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                const validationError = file
                  ? validateApplicationResume(file)
                  : null;
                setReplacementFile(validationError ? null : file);
                setFileError(validationError);
                setUploadProgress(0);
                if (validationError) {
                  event.target.value = "";
                }
              }}
            />
            {fileError && (
              <p className="text-xs text-destructive" role="alert">
                {fileError}
              </p>
            )}
            {replaceResume.isPending && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading replacement</span>
                  <span>{uploadProgress}%</span>
                </div>
                <progress
                  className="h-2 w-full accent-primary"
                  max={100}
                  value={uploadProgress}
                  aria-label="Replacement CV upload progress"
                />
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!replacementFile || replaceResume.isPending}
              onClick={() => void handleReplaceResume()}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {replaceResume.isPending
                ? "Uploading..."
                : application.resumeOriginalFilename
                  ? "Replace CV"
                  : "Upload CV"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApplicationsPage() {
  const applicationsQuery = useMyApplications();
  const applications = applicationsQuery.data ?? [];
  const interviews = applications.filter(
    ({ stage }) => stage === "INTERVIEWING",
  ).length;
  const positiveOutcomes = applications.filter(
    ({ stage }) => stage === "OFFER" || stage === "HIRED",
  ).length;

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">My applications</p>
          <h1 className="mt-2 text-4xl font-bold">Track every conversation.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A calm overview of saved roles, active interviews, and next steps.
          </p>
        </div>

        {applicationsQuery.isLoading && <ApplicationListSkeleton />}

        {applicationsQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="font-semibold">Applications unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getApiErrorMessage(
                    applicationsQuery.error,
                    "Couldn't load your applications.",
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

        {applicationsQuery.isSuccess && applications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="font-semibold">No applications yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Browse open roles and apply when you find the right fit.
                </p>
              </div>
              <Link
                to="/jobs"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Browse jobs
              </Link>
            </CardContent>
          </Card>
        )}

        {applicationsQuery.isSuccess && applications.length > 0 && (
          <div className="grid gap-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            ))}
          </div>
        )}

        {applicationsQuery.isSuccess && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl">Application health</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                [String(applications.length), "Total applications"],
                [String(interviews), "Interviews in progress"],
                [String(positiveOutcomes), "Offers and hires"],
              ].map(([value, label]) => (
                <div key={label} className="border-l pl-4">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
