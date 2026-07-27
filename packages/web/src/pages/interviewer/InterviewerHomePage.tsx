import {
  BriefcaseBusiness,
  ClipboardCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
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

export function InterviewerHomePage() {
  const assignmentsQuery = useInterviewerAssignments();
  const assignments = assignmentsQuery.data ?? [];
  const activeAssignments = assignments.filter(
    ({ application }) =>
      application.stage !== "REJECTED" && application.stage !== "HIRED",
  );
  const interviewing = assignments.filter(
    ({ application }) => application.stage === "INTERVIEWING",
  );
  const candidateCount = new Set(
    assignments.map(
      ({ application }) => application.candidateProfile.user.id,
    ),
  ).size;

  const metrics: Array<[LucideIcon, number, string]> = [
    [BriefcaseBusiness, activeAssignments.length, "Active assignments"],
    [ClipboardCheck, interviewing.length, "At interviewing"],
    [UsersRound, candidateCount, "Assigned candidates"],
  ];

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Interviewer home</p>
            <h1 className="mt-2 text-4xl font-bold">
              Candidate context, ready when you are.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Review the candidates and jobs assigned to you using live hiring
              data.
            </p>
          </div>
          <Link
            to="/interviewer/pipeline"
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            View assignments
          </Link>
        </div>

        {assignmentsQuery.isLoading ? (
          <div
            className="grid gap-4 md:grid-cols-3"
            aria-label="Loading interviewer workspace"
          >
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : assignmentsQuery.isError ? (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <p className="text-sm text-muted-foreground">
                {getApiErrorMessage(
                  assignmentsQuery.error,
                  "Couldn't load your interviewer assignments.",
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
        ) : (
          <>
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
                <CardTitle className="text-xl">Recent assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="rounded-md border border-dashed p-5">
                    <p className="font-medium">No assignments yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Recruiter assignments will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {assignments.slice(0, 3).map((assignment) => (
                      <div key={assignment.id} className="border-l pl-4">
                        <p className="font-semibold">
                          {assignment.application.candidateProfile.user.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {assignment.application.job.title}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Assigned {formatDate(assignment.createdAt)}
                        </p>
                        <Badge className="mt-3" variant="secondary">
                          {assignment.application.stage}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
