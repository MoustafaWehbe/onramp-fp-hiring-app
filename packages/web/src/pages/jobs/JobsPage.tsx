import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { JobCard } from "../../components/jobs/JobCard";
import { JobFilters } from "../../components/jobs/JobFilters";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { RecommendedJobs } from "../../features/candidate/components/RecommendedJobs";
import { usePublicJobs } from "../../features/jobs/hooks";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api-errors";
import { toJobSummary } from "../../lib/job-presentation";
import { CARD_CLASS } from "../../features/candidate/theme";
import { cn } from "../../lib/utils";

const ALL_STACKS = "All stacks";

function JobCardSkeleton() {
  return (
    <Card className={cn(CARD_CLASS, "flex h-full flex-col")} aria-hidden="true">
      <CardHeader className="space-y-4 p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-4/5" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-0">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function JobsPage() {
  const [selectedStack, setSelectedStack] = useState<string>(ALL_STACKS);
  const { currentRole } = useAuth();
  const jobsQuery = usePublicJobs();

  const jobs = useMemo(
    () => (jobsQuery.data ?? []).map(toJobSummary),
    [jobsQuery.data],
  );

  const stackFilters = useMemo(
    () => [
      ALL_STACKS,
      ...Array.from(new Set(jobs.flatMap((job) => job.skills))).sort((a, b) =>
        a.localeCompare(b),
      ),
    ],
    [jobs],
  );

  const activeStack = stackFilters.includes(selectedStack)
    ? selectedStack
    : ALL_STACKS;

  const visibleJobs = useMemo(
    () =>
      activeStack === ALL_STACKS
        ? jobs
        : jobs.filter((job) => job.skills.includes(activeStack)),
    [activeStack, jobs],
  );

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="flex max-w-3xl flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden="true" />
              {jobsQuery.isLoading
                ? "Finding open roles..."
                : `${jobs.length} open ${jobs.length === 1 ? "role" : "roles"}`}
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Find a team where you'll actually thrive.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Open roles at thoughtful, small tech companies. Hand-picked,
              clearly written, and respectful of your time.
            </p>
          </div>
        </div>
      </section>

      {/* Candidates only: recommendations are scored against their own
          profile, and the endpoint is candidate-scoped. */}
      {currentRole === "candidate" && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <RecommendedJobs />
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {jobsQuery.isLoading ? (
          <div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Loading jobs"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <JobCardSkeleton key={index} />
            ))}
          </div>
        ) : jobsQuery.isError ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(
                jobsQuery.error,
                "Couldn't load open roles.",
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => void jobsQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            {jobs.length > 0 && (
              <div className="mb-6 space-y-5">
                <JobFilters
                  selectedStack={activeStack}
                  stacks={stackFilters}
                  onStackChange={setSelectedStack}
                />

                <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {visibleJobs.length}{" "}
                      {visibleJobs.length === 1 ? "role" : "roles"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {activeStack === ALL_STACKS
                        ? "Showing every open role."
                        : `Matching the ${activeStack} stack.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowDownWideNarrow
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    Sorted by most recent
                  </div>
                </div>
              </div>
            )}

            {visibleJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-card px-6 py-12 text-center">
                <h3 className="text-lg font-semibold">
                  {jobs.length === 0
                    ? "No open roles right now"
                    : "No roles match this stack"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {jobs.length === 0
                    ? "Check back soon for new opportunities."
                    : "Try another stack to widen the list."}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
