import {
  BriefcaseBusiness,
  CalendarDays,
  Filter,
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
import { mockJobs } from "../../data/jobs";
import { mockCandidates, pipelineStages } from "../../data/pipeline";
import { mockInterviews } from "../../data/interviews";
import { cn } from "../../lib/utils";

export function RecruiterDashboardPage() {
  const openJobs = mockJobs.filter((job) => job.status === "open");
  const recentApplicants = mockCandidates.slice(0, 3);
  const metrics: Array<[LucideIcon, number, string]> = [
    [BriefcaseBusiness, openJobs.length, "Active jobs"],
    [UsersRound, mockCandidates.length, "Candidates in pipeline"],
    [CalendarDays, mockInterviews.length, "Interviews scheduled"],
    [Filter, pipelineStages.length, "Funnel stages"],
  ];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Recruiter dashboard</p>
            <h1 className="mt-2 text-4xl font-bold">Keep hiring momentum visible.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Review role health, pipeline flow, and upcoming interviews from a
              single recruiter workspace.
            </p>
          </div>
          <Link
            to="/recruiter/pipeline"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            View pipeline
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Hiring funnel summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pipelineStages.map((stage) => (
                <div key={stage.stage}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{stage.stage}</span>
                    <span className="text-muted-foreground">{stage.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary",
                        stage.stage === "Applied" && "w-full",
                        stage.stage === "Screen" && "w-7/12",
                        stage.stage === "Technical" && "w-1/3",
                        stage.stage === "Final" && "w-1/5",
                        stage.stage === "Offer" && "w-1/12",
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent applicants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentApplicants.map((candidate) => (
                <div key={candidate.id} className="border-l pl-4">
                  <p className="font-medium">{candidate.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {candidate.role} · {candidate.source}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{candidate.stage}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {candidate.fitScore}% fit
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
