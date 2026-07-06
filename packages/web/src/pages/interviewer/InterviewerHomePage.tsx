import {
  CalendarDays,
  ClipboardCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { mockInterviews } from "../../data/interviews";
import { mockCandidates } from "../../data/pipeline";
import { cn } from "../../lib/utils";

export function InterviewerHomePage() {
  const feedbackPending = mockInterviews.filter(
    (interview) => interview.feedbackStatus === "Pending",
  );
  const metrics: Array<[LucideIcon, number, string]> = [
    [CalendarDays, mockInterviews.length, "Upcoming interviews"],
    [ClipboardCheck, feedbackPending.length, "Feedback pending"],
    [UsersRound, mockCandidates.length, "Assigned candidates"],
  ];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Interviewer home</p>
            <h1 className="mt-2 text-4xl font-bold">Prepared interviews, clearer feedback.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Track assigned candidates, upcoming interview times, and feedback
              that still needs your attention.
            </p>
          </div>
          <Link
            to="/interviewer/schedule"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            View schedule
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map(([Icon, value, label]) => (
            <Card key={label}>
              <CardContent className="flex gap-4 p-5">
                <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">Next interviews</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {mockInterviews.map((interview) => (
              <div key={interview.id} className="border-l pl-4">
                <p className="font-semibold">{interview.candidateName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {interview.role}
                </p>
                <p className="mt-2 text-sm">
                  {interview.date}, {interview.time}
                </p>
                <Badge className="mt-3" variant="secondary">
                  {interview.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
