import { ArrowRight, FileCheck2, Search, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { JobCard } from "../../components/jobs/JobCard";
import { Badge } from "../../components/ui/badge";
import { buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { mockApplications } from "../../data/applications";
import { mockJobs } from "../../data/jobs";
import { candidateProfile } from "../../data/users";
import { cn } from "../../lib/utils";

export function CandidateHomePage() {
  const recommendedJobs = mockJobs.slice(0, 3);

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Candidate home</p>
            <h1 className="mt-2 text-4xl font-bold">Good roles, clearly tracked.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Review recommended roles, watch your application movement, and
              keep your profile ready for recruiters.
            </p>
          </div>
          <Link
            to="/jobs"
            className={cn(buttonVariants(), "w-full gap-2 sm:w-auto")}
          >
            Browse jobs
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex gap-4 p-5">
              <Search className="h-9 w-9 text-primary" aria-hidden="true" />
              <div>
                <p className="text-2xl font-semibold">{recommendedJobs.length}</p>
                <p className="text-sm text-muted-foreground">Recommended jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-4 p-5">
              <FileCheck2 className="h-9 w-9 text-primary" aria-hidden="true" />
              <div>
                <p className="text-2xl font-semibold">{mockApplications.length}</p>
                <p className="text-sm text-muted-foreground">
                  Applications in motion
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-4 p-5">
              <UserRound className="h-9 w-9 text-primary" aria-hidden="true" />
              <div>
                <p className="text-2xl font-semibold">
                  {candidateProfile.completion}%
                </p>
                <p className="text-sm text-muted-foreground">Profile complete</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Recommended jobs</h2>
              <Link
                to="/jobs"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {recommendedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Application status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockApplications.map((application) => (
                  <div key={application.id} className="border-l pl-4">
                    <p className="font-medium">{application.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {application.company} · {application.stage}
                    </p>
                    <Badge className="mt-2" variant="secondary">
                      {application.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Profile readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-10/12 rounded-full bg-primary" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Add recent outcomes and keep your summary crisp before sharing
                  your profile.
                </p>
                <Link
                  to="/profile"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-4 w-full",
                  )}
                >
                  Review profile
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
