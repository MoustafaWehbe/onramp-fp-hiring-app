import { isAxiosError } from "axios";
import { ArrowLeft, Building2, ExternalLink, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { JobCard } from "../components/jobs/JobCard";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useCompanyCareersPage } from "../features/company/hooks";
import { getApiErrorMessage } from "../lib/api-errors";
import { toJobSummary } from "../lib/job-presentation";
import { cn } from "../lib/utils";
import type { PublicCompanyRecord } from "../types/company";

/**
 * A company's public, unauthenticated careers page.
 *
 * Job listings render through the same JobCard the browse page uses, from the
 * same public payload, so the two can't drift apart on what a role shows.
 */

function CareerPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-5 w-28" />
      <div className="mt-8 flex items-center gap-5">
        <Skeleton className="h-20 w-20 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/**
 * The logo when one is set, the company's initial when not.
 *
 * A remote logoUrl is recruiter-supplied and can 404 at any time, so a failure
 * swaps in the same fallback rather than leaving a broken-image icon on the
 * company's own front door.
 */
function CompanyLogo({ company }: { company: PublicCompanyRecord }) {
  const fallback = (
    <span
      aria-hidden="true"
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-muted text-2xl font-bold text-muted-foreground"
    >
      {company.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );

  if (!company.logoUrl) {
    return fallback;
  }

  return (
    <img
      src={company.logoUrl}
      alt={`${company.name} logo`}
      className="h-20 w-20 shrink-0 rounded-xl border bg-card object-contain p-2"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function BackToJobsLink({ className }: { className?: string }) {
  return (
    <Link
      to="/jobs"
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to all jobs
    </Link>
  );
}

export function PublicCareerPage() {
  const { companyId } = useParams();
  const careersQuery = useCompanyCareersPage(companyId);

  if (careersQuery.isLoading) {
    return <CareerPageSkeleton />;
  }

  const companyNotFound =
    isAxiosError(careersQuery.error) &&
    careersQuery.error.response?.status === 404;

  if (careersQuery.isError || !careersQuery.data) {
    // A genuine failure gets a retry; a 404 doesn't, because retrying a
    // company that doesn't exist can only fail again.
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold">
          {companyNotFound ? "Company not found" : "We couldn't load this page"}
        </h1>
        <p className="mt-3 text-muted-foreground" role="alert">
          {companyNotFound
            ? "This careers page may have moved, or the link may be incomplete."
            : getApiErrorMessage(
                careersQuery.error,
                "Something went wrong while loading this careers page.",
              )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!companyNotFound && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void careersQuery.refetch()}
            >
              Try again
            </Button>
          )}
          <Link to="/jobs" className={buttonVariants()}>
            Browse all jobs
          </Link>
        </div>
      </section>
    );
  }

  const { company, jobs } = careersQuery.data;
  const roleCount = jobs.length;

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <BackToJobsLink />

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start">
            <CompanyLogo company={company} />

            <div className="min-w-0 flex-1">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
                <Search className="h-4 w-4" aria-hidden="true" />
                {roleCount} open {roleCount === 1 ? "role" : "roles"}
              </div>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                Careers at {company.name}
              </h1>
              {company.description && (
                <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                  {company.description}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Visit {company.name}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold">Open positions</h2>

        {roleCount > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={toJobSummary(job)}
                linkCompany={false}
              />
            ))}
          </div>
        ) : (
          <Card className="mt-6">
            <CardHeader className="items-center pb-0 text-center">
              <Building2
                className="h-8 w-8 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="px-6 py-6 text-center">
              <h3 className="text-lg font-semibold">
                No open roles right now
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {company.name} isn't hiring at the moment. Check back soon, or
                see who else is.
              </p>
              <Link to="/jobs" className={cn(buttonVariants(), "mt-5")}>
                Browse all jobs
              </Link>
            </CardContent>
          </Card>
        )}

        {roleCount > 0 && (
          <div className="mt-8 border-t pt-6">
            <BackToJobsLink />
          </div>
        )}
      </section>
    </div>
  );
}
