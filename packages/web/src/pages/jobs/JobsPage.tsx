import { useEffect, useMemo } from "react";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { JobCard } from "../../components/jobs/JobCard";
import {
  JobFilters,
  type JobFilterKey,
  type JobFilterValues,
  type RemoteFilter,
} from "../../components/jobs/JobFilters";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { RecommendedJobs } from "../../features/candidate/components/RecommendedJobs";
import { useSkills } from "../../features/candidate/hooks";
import { usePublicJobs } from "../../features/jobs/hooks";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../lib/api-errors";
import { toJobSummary } from "../../lib/job-presentation";
import { CARD_CLASS } from "../../features/candidate/theme";
import { cn } from "../../lib/utils";
import type { EmploymentType } from "../../types/jobs";

const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
];

function readRemoteFilter(value: string | null): RemoteFilter {
  return value === "remote" || value === "onsite" ? value : "";
}

function readEmploymentType(value: string | null): "" | EmploymentType {
  return EMPLOYMENT_TYPES.includes(value as EmploymentType)
    ? (value as EmploymentType)
    : "";
}

function readSalary(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? value : "";
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, currentRole } = useAuth();
  const jobsQuery = usePublicJobs();
  const skillsQuery = useSkills(Boolean(user && currentRole === "candidate"));

  const jobs = useMemo(
    () => (jobsQuery.data ?? []).map(toJobSummary),
    [jobsQuery.data],
  );

  const skillFilters = useMemo(
    () =>
      Array.from(new Set(jobs.flatMap((job) => job.skills))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [jobs],
  );

  const currencies = useMemo(
    () =>
      Array.from(new Set(jobs.map((job) => job.salaryCurrency))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [jobs],
  );

  const requestedCurrency = searchParams.get("currency") ?? "";
  const rawSalaryMin = searchParams.get("salaryMin");
  const rawSalaryMax = searchParams.get("salaryMax");
  const normalizedSalaryMin = readSalary(rawSalaryMin);
  const normalizedSalaryMax = readSalary(rawSalaryMax);
  const explicitCurrency =
    currencies.length > 1 && currencies.includes(requestedCurrency)
      ? requestedCurrency
      : "";
  const effectiveSalaryCurrency =
    explicitCurrency || (currencies.length === 1 ? currencies[0] : "");
  const salaryCurrencyContextIsValid =
    currencies.length === 1
      ? requestedCurrency === "" || requestedCurrency === currencies[0]
      : currencies.length > 1 && explicitCurrency !== "";

  // URLs can outlive the jobs that supplied their currency options. Canonicalize
  // that stale state once the feed settles so a EUR bound can never be silently
  // reinterpreted as USD, nor remain trapped in disabled mixed-currency inputs.
  useEffect(() => {
    if (jobsQuery.isLoading || jobsQuery.isError) {
      return;
    }

    const next = new URLSearchParams(searchParams);

    if (rawSalaryMin !== null && normalizedSalaryMin === "") {
      next.delete("salaryMin");
    }
    if (rawSalaryMax !== null && normalizedSalaryMax === "") {
      next.delete("salaryMax");
    }

    if (currencies.length === 0) {
      next.delete("currency");
      next.delete("salaryMin");
      next.delete("salaryMax");
    } else if (currencies.length === 1) {
      if (requestedCurrency && requestedCurrency !== currencies[0]) {
        next.delete("salaryMin");
        next.delete("salaryMax");
      }
      // A sole currency is an implicit default, not a hidden active filter.
      next.delete("currency");
    } else if (!currencies.includes(requestedCurrency)) {
      next.delete("currency");
      next.delete("salaryMin");
      next.delete("salaryMax");
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    currencies,
    jobsQuery.isError,
    jobsQuery.isLoading,
    normalizedSalaryMax,
    normalizedSalaryMin,
    rawSalaryMax,
    rawSalaryMin,
    requestedCurrency,
    searchParams,
    setSearchParams,
  ]);

  const filters: JobFilterValues = {
    q: searchParams.get("q") ?? "",
    location: searchParams.get("location") ?? "",
    remote: readRemoteFilter(searchParams.get("remote")),
    employmentType: readEmploymentType(searchParams.get("employmentType")),
    skill: skillFilters.includes(searchParams.get("skill") ?? "")
      ? (searchParams.get("skill") as string)
      : "",
    currency: explicitCurrency,
    salaryMin: salaryCurrencyContextIsValid ? normalizedSalaryMin : "",
    salaryMax: salaryCurrencyContextIsValid ? normalizedSalaryMax : "",
  };

  const normalizedKeyword = filters.q.trim().toLocaleLowerCase();
  const normalizedLocation = filters.location.trim().toLocaleLowerCase();
  const minimumSalary =
    filters.salaryMin === "" ? null : Number(filters.salaryMin);
  const maximumSalary =
    filters.salaryMax === "" ? null : Number(filters.salaryMax);
  const hasSalaryBounds = minimumSalary !== null || maximumSalary !== null;
  const hasInvalidSalaryRange =
    minimumSalary !== null &&
    maximumSalary !== null &&
    minimumSalary > maximumSalary;
  const salaryRangeError = hasInvalidSalaryRange
    ? "Minimum salary cannot be greater than maximum salary."
    : undefined;

  const visibleJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const normalizedSkills = job.skills.map((skill) =>
          skill.toLocaleLowerCase(),
        );
        const matchesKeyword =
          normalizedKeyword === "" ||
          [
            job.title,
            job.company ?? "",
            job.location ?? "",
            ...job.skills,
            job.description ?? "",
          ].some((value) =>
            value.toLocaleLowerCase().includes(normalizedKeyword),
          );
        const matchesLocation =
          normalizedLocation === "" ||
          (job.location ?? "").toLocaleLowerCase().includes(normalizedLocation);
        const matchesRemote =
          filters.remote === "" ||
          (filters.remote === "remote" ? job.isRemote : !job.isRemote);
        const matchesEmploymentType =
          filters.employmentType === "" ||
          job.employmentType === filters.employmentType;
        const matchesSkill =
          filters.skill === "" ||
          normalizedSkills.includes(filters.skill.toLocaleLowerCase());

        // Salary figures are only comparable inside one currency. A sole
        // currency is an honest implicit default; mixed feeds require the
        // candidate to choose one before the numeric inputs become active.
        const matchesSalaryCurrency =
          !filters.currency && !hasSalaryBounds
            ? true
            : effectiveSalaryCurrency !== "" &&
              job.salaryCurrency === effectiveSalaryCurrency;
        const matchesSalaryMinimum =
          minimumSalary === null || job.salaryMax >= minimumSalary;
        const matchesSalaryMaximum =
          maximumSalary === null || job.salaryMin <= maximumSalary;

        return (
          matchesKeyword &&
          matchesLocation &&
          matchesRemote &&
          matchesEmploymentType &&
          matchesSkill &&
          !hasInvalidSalaryRange &&
          matchesSalaryCurrency &&
          matchesSalaryMinimum &&
          matchesSalaryMaximum
        );
      }),
    [
      effectiveSalaryCurrency,
      filters.currency,
      filters.employmentType,
      filters.remote,
      filters.skill,
      hasInvalidSalaryRange,
      hasSalaryBounds,
      jobs,
      maximumSalary,
      minimumSalary,
      normalizedKeyword,
      normalizedLocation,
    ],
  );

  const hasActiveFilters = Boolean(
    filters.q.trim() ||
      filters.location.trim() ||
      filters.remote ||
      filters.employmentType ||
      filters.skill ||
      filters.currency ||
      filters.salaryMin ||
      filters.salaryMax,
  );

  function updateFilter(key: JobFilterKey, value: string) {
    const next = new URLSearchParams(searchParams);

    if (
      currencies.length === 1 &&
      (key === "salaryMin" || key === "salaryMax")
    ) {
      next.delete("currency");
    }

    if (key === "currency" && value === "") {
      next.delete("currency");
      next.delete("salaryMin");
      next.delete("salaryMax");
    } else if (value.trim() === "") {
      next.delete(key);
    } else {
      next.set(key, value);

      if (
        (key === "salaryMin" || key === "salaryMax") &&
        effectiveSalaryCurrency &&
        currencies.length > 1
      ) {
        next.set("currency", effectiveSalaryCurrency);
      }
    }

    setSearchParams(next, { replace: true });
  }

  function clearAllFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  const candidateSkills =
    user &&
    currentRole === "candidate" &&
    skillsQuery.isSuccess &&
    !skillsQuery.isFetching
      ? skillsQuery.data
      : undefined;

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="flex max-w-3xl flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden="true" />
              {jobsQuery.isLoading
                ? "Finding open roles..."
                : `${visibleJobs.length} open ${
                    visibleJobs.length === 1 ? "role" : "roles"
                  }`}
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
            <div className="mb-6 space-y-5">
              <Card className={CARD_CLASS}>
                <CardContent className="p-5">
                <JobFilters
                    values={filters}
                    skills={skillFilters}
                    currencies={currencies}
                    effectiveSalaryCurrency={effectiveSalaryCurrency}
                    salaryRangeError={salaryRangeError}
                    onChange={updateFilter}
                    onClearAll={clearAllFilters}
                />
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold" aria-live="polite">
                    {visibleJobs.length}{" "}
                    {visibleJobs.length === 1 ? "job" : "jobs"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? `Filtered from ${jobs.length} open ${
                          jobs.length === 1 ? "role" : "roles"
                        }.`
                      : "Showing every open role."}
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

            {visibleJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    candidateSkills={candidateSkills}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-card px-6 py-12 text-center">
                <h3 className="text-lg font-semibold">
                  {jobs.length === 0
                    ? "No open roles right now"
                    : "No jobs match these filters"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {jobs.length === 0
                    ? "Check back soon for new opportunities."
                    : "Remove a filter or clear everything to widen your search."}
                </p>
                {jobs.length > 0 && hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
