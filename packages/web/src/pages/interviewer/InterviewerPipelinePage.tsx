import { FileText, Mail, MapPin } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useInterviewerAssignments } from "../../features/interviewer/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn, formatDate } from "../../lib/utils";

export function InterviewerPipelinePage() {
  const assignmentsQuery = useInterviewerAssignments();
  const assignments = assignmentsQuery.data ?? [];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">
            Assigned candidates
          </p>
          <h1 className="mt-2 text-4xl font-bold">Candidates assigned to you.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Review real candidate context, the hiring stage, and the role
            before meeting the candidate.
          </p>
        </div>

        {assignmentsQuery.isLoading && (
          <div className="grid gap-4" aria-label="Loading assignments">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-56 rounded-lg" />
            ))}
          </div>
        )}

        {assignmentsQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-muted-foreground">
                {getApiErrorMessage(
                  assignmentsQuery.error,
                  "Couldn't load your assigned candidates.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void assignmentsQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {assignmentsQuery.isSuccess && assignments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="font-semibold">No assigned candidates</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Candidates will appear after a recruiter assigns you.
              </p>
            </CardContent>
          </Card>
        )}

        {assignments.length > 0 && (
          <div className="grid gap-4">
            {assignments.map((assignment) => {
              const { application } = assignment;
              const { candidateProfile, job } = application;
              const resumeUrl =
                application.resumeUrl ?? candidateProfile.resumeUrl;

              return (
                <Card key={assignment.id}>
                  <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                    <div>
                      <CardTitle className="text-xl">
                        {candidateProfile.user.name}
                      </CardTitle>
                      <a
                        href={`mailto:${candidateProfile.user.email}`}
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        {candidateProfile.user.email}
                      </a>
                    </div>
                    <Badge variant="secondary">{application.stage}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {job.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {job.location}
                          </span>
                        )}
                        <span>Assigned {formatDate(assignment.createdAt)}</span>
                      </div>
                    </div>

                    {candidateProfile.headline && (
                      <p className="text-sm text-muted-foreground">
                        {candidateProfile.headline}
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

                    {resumeUrl && (
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-2",
                        )}
                      >
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        View resume
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
