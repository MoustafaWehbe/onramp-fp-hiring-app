import { CalendarDays, Clock3 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { mockInterviews } from "../../data/interviews";

export function InterviewerSchedulePage() {
  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Interview schedule</p>
          <h1 className="mt-2 text-4xl font-bold">Your interview day at a glance.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            See candidate, role, time, status, and feedback action in one place.
          </p>
        </div>

        <div className="grid gap-4">
          {mockInterviews.map((interview) => (
            <Card key={interview.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {interview.candidateName}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {interview.role} · {interview.interviewType}
                    </p>
                  </div>
                  <Badge variant="secondary">{interview.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {interview.date}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {interview.time}
                  </span>
                </div>
                <Button
                  variant={
                    interview.feedbackStatus === "Pending" ? "default" : "outline"
                  }
                >
                  {interview.feedbackStatus === "Pending"
                    ? "Submit feedback"
                    : "Prepare feedback"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
