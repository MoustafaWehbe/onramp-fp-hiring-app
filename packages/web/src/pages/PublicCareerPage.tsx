import { isAxiosError } from "axios";
import { ArrowLeft, Building2, ExternalLink, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { JobCard } from "../components/jobs/JobCard";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { CompanyLogo } from "../components/shared/CompanyLogo";
import {
  ACCENT_CHIP,
  ACCENT_GRADIENT,
  ACCENT_SURFACE,
  ACCENT_TEXT,
  APP_CONTENT_CLASS,
  BORDER_SUBTLE,
  CARD_CLASS,
  IDENTITY_HEADING_CLASS,
  PAGE_SECTION_SPACING,
  SECTION_HEADING_CLASS,
  TEXT_BODY,
  TEXT_HEADING,
  TEXT_META,
} from "../features/candidate/theme";
import { useCompanyCareersPage } from "../features/company/hooks";
import { getApiErrorMessage } from "../lib/api-errors";
import { toJobSummary } from "../lib/job-presentation";
import { cn } from "../lib/utils";

/**
 * A company's public, unauthenticated careers page.
 *
 * Job listings render through the same JobCard the browse page uses, from the
 * same public payload, so the two can't drift apart on what a role shows.
 */

function CareerPageSkeleton() {
  return (
    <div className="min-h-full bg-muted/30">
      <div
        className={cn(APP_CONTENT_CLASS, PAGE_SECTION_SPACING, "py-8")}
        aria-label="Loading careers page"
      >
        <Skeleton className="h-5 w-28" />
        <Card className={cn(CARD_CLASS, "overflow-hidden")} aria-hidden="true">
          <Skeleton className="h-28 w-full rounded-none sm:h-36" />
          <CardContent className="px-6 pb-6 pt-0">
            <Skeleton className="-mt-12 h-24 w-24 rounded-xl sm:-mt-14 sm:h-28 sm:w-28" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-8 w-2/3 max-w-lg" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-2/3 max-w-xl" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function BackToJobsLink({ className }: { className?: string }) {
  return (
    <Link
      to="/jobs"
      className={cn(
        "inline-flex items-center gap-2 rounded-md text-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        TEXT_META,
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
      <div className="min-h-full bg-muted/30">
        <section
          className={cn(
            APP_CONTENT_CLASS,
            "flex min-h-[70vh] items-center justify-center py-8 text-center",
          )}
        >
          <Card className={cn(CARD_CLASS, "w-full max-w-2xl")}>
            <CardContent className="flex flex-col items-center p-8 sm:p-10">
              <h1
                className={cn(IDENTITY_HEADING_CLASS, TEXT_HEADING)}
              >
                {companyNotFound
                  ? "Company not found"
                  : "We couldn't load this page"}
              </h1>
              <p className={cn("mt-3", TEXT_BODY)} role="alert">
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
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  const { company, jobs } = careersQuery.data;
  const roleCount = jobs.length;

  return (
    <div className="min-h-full bg-muted/30">
      <div className={cn(APP_CONTENT_CLASS, PAGE_SECTION_SPACING, "py-8")}>
        <BackToJobsLink />

        {/* The public company identity deliberately mirrors the candidate
            identity card without inheriting any authenticated app chrome. */}
        <Card className={cn(CARD_CLASS, "overflow-hidden")}>
          <div
            className={cn("h-28 w-full sm:h-36", ACCENT_GRADIENT)}
            aria-hidden="true"
          />

          <CardContent className="px-6 pb-6 pt-0">
            <div className="-mt-12 sm:-mt-14">
              <CompanyLogo
                name={company.name}
                logoUrl={company.logoUrl}
                className="h-24 w-24 sm:h-28 sm:w-28"
              />
            </div>

            <div className="mt-4">
              <h1
                className={cn(IDENTITY_HEADING_CLASS, TEXT_HEADING)}
              >
                Careers at {company.name}
              </h1>
              {company.description && (
                <p className={cn("mt-2 max-w-3xl text-base", TEXT_BODY)}>
                  {company.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium",
                    ACCENT_CHIP,
                  )}
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {roleCount} open {roleCount === 1 ? "role" : "roles"}
                </span>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-sm text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      ACCENT_TEXT,
                    )}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Visit {company.name}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <section
          className={PAGE_SECTION_SPACING}
          aria-labelledby="open-positions-heading"
        >
          <div>
            <h2
              id="open-positions-heading"
              className={cn(SECTION_HEADING_CLASS, TEXT_HEADING)}
            >
              Open positions
            </h2>
            <p className={cn("mt-1 text-sm", TEXT_META)}>
              Explore current opportunities with {company.name}.
            </p>
          </div>

          {roleCount > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={toJobSummary(job)}
                  linkCompany={false}
                />
              ))}
            </div>
          ) : (
            <Card className={CARD_CLASS}>
              <CardContent className="flex flex-col items-center px-6 py-12 text-center">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    ACCENT_SURFACE,
                    ACCENT_TEXT,
                  )}
                  aria-hidden="true"
                >
                  <Building2 className="h-6 w-6" />
                </span>
                <h3
                  className={cn(
                    "mt-4",
                    SECTION_HEADING_CLASS,
                    TEXT_HEADING,
                  )}
                >
                  No open roles right now
                </h3>
                <p className={cn("mt-2 max-w-md text-sm", TEXT_BODY)}>
                  {company.name} isn't hiring at the moment. Check back soon,
                  or explore opportunities with other teams.
                </p>
                <Link to="/jobs" className={cn(buttonVariants(), "mt-5")}>
                  Browse all jobs
                </Link>
              </CardContent>
            </Card>
          )}

          {roleCount > 0 && (
            <div className={cn("border-t pt-6", BORDER_SUBTLE)}>
              <BackToJobsLink />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
