import { CalendarDays, ExternalLink, MapPin, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useRecruiterCalendar } from "../../features/calendar/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";

function formatInterview(value: string): { day: string; time: string } {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date),
  };
}

export function RecruiterCalendarPage() {
  const calendarQuery = useRecruiterCalendar();
  const interviews = calendarQuery.data ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Company calendar</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Upcoming interviews
            </h1>
            <p className="mt-2 text-muted-foreground">
              Every scheduled interview across your company's active jobs.
            </p>
          </div>
          <Link
            to="/recruiter/settings"
            className={buttonVariants({ variant: "outline" })}
          >
            Calendar settings
          </Link>
        </div>

        {calendarQuery.isLoading && (
          <div className="mt-6 grid gap-3" aria-label="Loading interviews">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-28 rounded-lg" />
            ))}
          </div>
        )}

        {calendarQuery.isError && (
          <Card className="mt-6 border-destructive/30">
            <CardContent className="p-6">
              <p className="font-medium">Calendar unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground" role="alert">
                {getApiErrorMessage(
                  calendarQuery.error,
                  "Couldn't load upcoming interviews.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => void calendarQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {calendarQuery.isSuccess && interviews.length === 0 && (
          <Card className="mt-6 border-dashed">
            <CardContent className="flex flex-col items-center p-10 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">No upcoming interviews</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scheduled interviews will appear here automatically.
              </p>
            </CardContent>
          </Card>
        )}

        {calendarQuery.isSuccess && interviews.length > 0 && (
          <div className="mt-6 grid gap-3">
            {interviews.map((interview) => {
              const formatted = formatInterview(interview.interviewDate);
              return (
                <Card key={interview.applicationId}>
                  <CardContent className="grid gap-4 p-5 sm:grid-cols-[170px_1fr_auto] sm:items-center">
                    <div>
                      <p className="font-semibold">{formatted.day}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatted.time}
                      </p>
                    </div>
                    <div>
                      <Link
                        to={`/recruiter/candidates/${interview.candidate.id}`}
                        className="font-medium hover:underline"
                      >
                        {interview.candidate.name}
                      </Link>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {interview.job.title}
                      </p>
                      {interview.calendarSyncStatus !== "synced" && (
                        <Badge
                          className="mt-2"
                          variant={
                            interview.calendarSyncStatus === "failed"
                              ? "muted"
                              : "outline"
                          }
                        >
                          {interview.calendarSyncStatus === "failed"
                            ? "Calendar sync failed"
                            : "Not synced"}
                        </Badge>
                      )}
                    </div>
                    {interview.googleMeetLink ? (
                      <a
                        href={interview.googleMeetLink}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(buttonVariants({ size: "sm" }), "gap-2")}
                      >
                        <Video className="h-4 w-4" aria-hidden="true" />
                        Join Meet
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No Meet link
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
    </>
  );
}
