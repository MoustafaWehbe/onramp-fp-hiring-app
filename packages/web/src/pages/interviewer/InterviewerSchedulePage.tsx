import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useInterviewerAssignments } from "../../features/interviewer/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { formatDate } from "../../lib/utils";

export function InterviewerSchedulePage() {
  const assignmentsQuery = useInterviewerAssignments();
  const assignments = assignmentsQuery.data ?? [];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">
            Assignment timeline
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            Your assignment history at a glance.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            HireFlow does not schedule interview times yet. This timeline shows
            when each candidate was assigned and their current application
            stage.
          </p>
        </div>

        {assignmentsQuery.isLoading && (
          <div className="grid gap-4" aria-label="Loading assignment timeline">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-40 rounded-lg" />
            ))}
          </div>
        )}

        {assignmentsQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-muted-foreground">
                {getApiErrorMessage(
                  assignmentsQuery.error,
                  "Couldn't load your assignment timeline.",
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
              <h2 className="font-semibold">No assignments yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your assignment history will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {assignments.length > 0 && (
          <div className="grid gap-4">
            {assignments.map((assignment) => {
              const { application } = assignment;
              return (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {application.candidateProfile.user.name}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {application.job.title}
                        </p>
                      </div>
                      <Badge variant="secondary">{application.stage}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Assigned {formatDate(assignment.createdAt)}
                    </span>
                    {application.job.location && (
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {application.job.location}
                      </span>
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
