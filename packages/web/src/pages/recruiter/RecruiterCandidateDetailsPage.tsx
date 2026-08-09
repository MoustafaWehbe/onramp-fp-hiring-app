import { isAxiosError } from "axios";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
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
import { InterviewDetailsForm } from "../../features/applications/components/InterviewDetailsForm";
import { formatInterviewDate } from "../../features/applications/interview-date";
import { useRecruiterCandidate } from "../../features/recruiter/hooks";
import { ScorecardPanel } from "../../features/scorecards/components/ScorecardPanel";
import { TalentPoolSection } from "../../features/recruiter/components/TalentPoolSection";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";

export function RecruiterCandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const candidateQuery = useRecruiterCandidate(id);

  if (candidateQuery.isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8"
        aria-label="Loading candidate profile"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const notFound =
    isAxiosError(candidateQuery.error) &&
    candidateQuery.error.response?.status === 404;

  if (!candidateQuery.data) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold">
          {notFound ? "Candidate not found" : "Candidate unavailable"}
        </h1>
        <p className="mt-3 text-muted-foreground" role="alert">
          {notFound
            ? "This candidate is not part of your company's application pipeline."
            : getApiErrorMessage(
                candidateQuery.error,
                "Couldn't load this candidate profile.",
              )}
        </p>
        <div className="mt-6 flex gap-3">
          {!notFound && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void candidateQuery.refetch()}
            >
              Try again
            </Button>
          )}
          <Link
            to="/recruiter/candidates"
            className={buttonVariants({ variant: notFound ? "default" : "secondary" })}
          >
            Back to candidates
          </Link>
        </div>
      </section>
    );
  }

  const candidate = candidateQuery.data;

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/recruiter/candidates"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to candidates
        </Link>

        <Card className="mt-6">
          <CardHeader>
            <p className="text-sm font-medium text-primary">
              Candidate profile
            </p>
            <CardTitle className="text-3xl">{candidate.user.name}</CardTitle>
            <p className="text-lg text-muted-foreground">
              {candidate.headline ?? "Candidate"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a
                href={`mailto:${candidate.user.email}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                {candidate.user.email}
              </a>
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-2 hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {candidate.phone}
                </a>
              )}
              {candidate.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {candidate.location}
                </span>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {candidate.bio ?? "No biography provided."}
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">Talent pool & outreach</h2>
              <div className="mt-3">
                <TalentPoolSection candidate={candidate} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">Application history</h2>
              {(candidate.applicationInsights?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-3">
                  {candidate.applicationInsights?.map((application) => (
                    <div
                      key={application.applicationId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-4"
                    >
                      <div>
                        <Link
                          to={`/recruiter/jobs/${application.jobId}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {application.jobTitle}
                        </Link>
                        {application.submittedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Applied {formatDate(application.submittedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{application.stage}</Badge>
                        {application.fitScore !== null && (
                          <Badge variant="secondary">
                            {application.fitScore}% fit
                          </Badge>
                        )}
                        {application.scorecardAverage != null && (
                          <Badge variant="secondary">
                            Scorecard {application.scorecardAverage.toFixed(1)}/5
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No company-scoped application history is available.
                </p>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">Interviews and notes</h2>
              {(candidate.applicationInsights?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-4">
                  {candidate.applicationInsights?.map((application) => (
                    <div
                      key={application.applicationId}
                      className="rounded-md border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {application.jobTitle}
                        </p>
                        {application.interviewDate && (
                          <Badge variant="outline">
                            <CalendarCheck
                              className="mr-1 h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Interview{" "}
                            {formatInterviewDate(application.interviewDate)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-4">
                        <InterviewDetailsForm
                          applicationId={application.applicationId}
                          jobId={application.jobId}
                          candidateProfileId={candidate.id}
                          interviewDate={application.interviewDate}
                          recruiterNotes={application.recruiterNotes}
                          interviewScheduledAt={
                            application.interviewScheduledAt
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No company-scoped applications are available to annotate.
                </p>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">Interview scorecards</h2>
              {(candidate.applicationInsights?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-4">
                  {candidate.applicationInsights?.map((application) => (
                    <div
                      key={application.applicationId}
                      className="rounded-md border bg-muted/20 p-4"
                    >
                      <p className="text-sm font-medium">
                        {application.jobTitle}
                      </p>
                      <div className="mt-4">
                        <ScorecardPanel
                          applicationId={application.applicationId}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No company-scoped applications are available to score.
                </p>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">AI fit insights</h2>
              {(candidate.applicationInsights?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-4">
                  {candidate.applicationInsights?.map((application) => (
                    <div
                      key={application.applicationId}
                      className="rounded-md border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {application.jobTitle}
                        </p>
                        {application.aiScoringStatus === "completed" &&
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
                            <Sparkles
                              className="mr-1 h-3.5 w-3.5"
                              aria-hidden="true"
                            />
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
                        )}
                      </div>

                      {application.aiScoringStatus === "completed" &&
                      application.fitScore !== null ? (
                        <div className="mt-4 space-y-4 text-sm">
                          <div>
                            <h3 className="font-medium">Summary</h3>
                            <p className="mt-1 leading-6 text-muted-foreground">
                              {application.aiSummary}
                            </p>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <h3 className="font-medium">Strengths</h3>
                              {application.aiStrengths.length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                  {application.aiStrengths.map((strength) => (
                                    <li key={strength}>{strength}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-muted-foreground">
                                  No clear strengths were identified.
                                </p>
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium">Gaps</h3>
                              {application.aiGaps.length > 0 ? (
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                  {application.aiGaps.map((gap) => (
                                    <li key={gap}>{gap}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-muted-foreground">
                                  No material gaps were identified.
                                </p>
                              )}
                            </div>
                          </div>
                          {application.aiScoredAt && (
                            <p className="text-xs text-muted-foreground">
                              Scored {formatDate(application.aiScoredAt)}
                            </p>
                          )}
                        </div>
                      ) : application.aiScoringStatus === "pending" ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          The application is being scored. This view updates
                          automatically.
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          This application is not yet scored. A recruiter can
                          retry it from the job pipeline.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No company-scoped applications are available for scoring.
                </p>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">Application CVs</h2>
              {(candidate.applicationResumes?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-3">
                  {candidate.applicationResumes?.map((resume) => (
                    <div
                      key={resume.applicationId}
                      className="rounded-md border bg-muted/20 p-4"
                    >
                      <p className="text-sm font-medium">{resume.jobTitle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {resume.resumeOriginalFilename}
                        {resume.resumeUploadedAt
                          ? ` · uploaded ${formatDate(
                              resume.resumeUploadedAt,
                            )}`
                          : ""}
                      </p>
                      {(resume.parsedSkills?.length ?? 0) > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Parsed skills: {resume.parsedSkills.join(", ")}
                        </p>
                      )}
                      <a
                        href={resume.resumeDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "mt-3 gap-2",
                        )}
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        View or download CV
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  This candidate has no application-specific CV for your
                  company.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
