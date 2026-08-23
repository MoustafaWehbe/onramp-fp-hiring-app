import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  FileCheck2,
  Loader2,
  Search,
  UserRound,
  UserRoundPen,
} from "lucide-react";
import { Link } from "react-router-dom";
import { JobCard } from "../../components/jobs/JobCard";
import { JobFilters } from "../../components/jobs/JobFilters";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Reveal } from "../../components/shared/Reveal";
import { Skeleton } from "../../components/ui/skeleton";
import { useMyApplications } from "../../features/applications/hooks";
import {
  useExperience,
  useProfile,
  useRecommendations,
  useSkills,
} from "../../features/candidate/hooks";
import { usePublicJobs } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { toJobSummary } from "../../lib/job-presentation";
import { cn, formatDate } from "../../lib/utils";
import type { ApplicationStage } from "../../types/applications";
import type { JobRecommendation } from "../../types/candidate";
import type { EmploymentType, JobSummary } from "../../types/jobs";

const stageLabels: Record<ApplicationStage, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  REVIEWED: "In review",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Not selected",
};

const ALL_STACKS = "All stacks";
const RECOMMENDATIONS_LIMIT = 4;

/**
 * Dark-mode-only card polish (rounded-2xl + soft indigo-tinted shadow,
 * matching JobCard's CARD_CLASS). Light mode intentionally keeps the plain
 * shadcn Card default (rounded-lg, shadow-sm) — this page's light mode was
 * reverted to its pre-polish-pass look, while dark mode keeps the refinement.
 */
const CARD_DARK_POLISH =
  "dark:rounded-2xl dark:border-stone-800 dark:bg-stone-900 dark:shadow-[0_6px_24px_-4px_rgba(129,140,248,0.15)]";

/**
 * The recommendations endpoint returns a leaner job shape than the public
 * jobs list (no description, no explicit "OPEN" status literal), so it can't
 * go through toJobSummary directly. This adapts it to the same JobSummary
 * shape JobCard already renders, so the card itself needs no changes.
 */
function toRecommendationJobSummary(
  recommendation: JobRecommendation,
): JobSummary | null {
  const { job } = recommendation;
  if (!job) return null;

  return {
    id: job.id,
    company: job.company?.name ?? null,
    companyId: job.company?.id ?? null,
    title: job.title,
    status: "open",
    location: job.location,
    employmentType: job.employmentType as EmploymentType,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    isRemote: job.isRemote,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    skills: job.skills,
    postedAt: formatDate(job.createdAt),
  };
}

export function CandidateHomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStack, setSelectedStack] = useState<string>(ALL_STACKS);
  const jobsQuery = usePublicJobs();
  const applicationsQuery = useMyApplications();
  const recommendationsQuery = useRecommendations(RECOMMENDATIONS_LIMIT);
  const profileQuery = useProfile();
  const profileMissing =
    isAxiosError(profileQuery.error) &&
    profileQuery.error.response?.status === 404;
  const hasProfile = profileQuery.isSuccess;
  const experienceQuery = useExperience(hasProfile);
  const skillsQuery = useSkills(hasProfile);
  const applicationsNeedProfile =
    isAxiosError(applicationsQuery.error) &&
    applicationsQuery.error.response?.status === 404;
  const applicationsUnavailable =
    applicationsQuery.isError && !applicationsNeedProfile;
  const profileUnavailable = profileQuery.isError && !profileMissing;
  const profileDetailsUnavailable =
    hasProfile && (experienceQuery.isError || skillsQuery.isError);
  const profileCompletionUnavailable =
    profileUnavailable || profileDetailsUnavailable;
  const profileCompletionLoading =
    profileQuery.isLoading ||
    (hasProfile && (experienceQuery.isLoading || skillsQuery.isLoading));

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
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesStack =
          activeStack === ALL_STACKS || job.skills.includes(activeStack);
        const matchesSearch =
          normalizedSearch === "" ||
          job.title.toLowerCase().includes(normalizedSearch) ||
          job.company?.toLowerCase().includes(normalizedSearch);
        return matchesStack && matchesSearch;
      }),
    [jobs, activeStack, normalizedSearch],
  );
  const recommendedJobs = filteredJobs.slice(0, 3);
  const recommendationCards = useMemo(
    () =>
      (recommendationsQuery.data?.recommendations ?? []).flatMap(
        (recommendation) => {
          const summary = toRecommendationJobSummary(recommendation);
          return summary ? [{ recommendation, summary }] : [];
        },
      ),
    [recommendationsQuery.data],
  );
  const applications = applicationsQuery.data ?? [];
  const activeApplications = applications.filter(
    ({ stage }) => stage !== "REJECTED" && stage !== "HIRED",
  );

  const profileSignals = hasProfile
    ? [
        profileQuery.data.headline,
        profileQuery.data.bio,
        profileQuery.data.phone,
        profileQuery.data.location,
        profileQuery.data.resumeUrl,
        (experienceQuery.data?.length ?? 0) > 0,
        (skillsQuery.data?.length ?? 0) > 0,
      ]
    : [];
  const profileCompletion =
    profileSignals.length === 0
      ? 0
      : Math.round(
          (profileSignals.filter(Boolean).length / profileSignals.length) * 100,
        );

  return (
    <div className="bg-muted/30">
      {/* Hero: a full gradient built from the app's existing indigo accent
          (the same hue as --primary/ACCENT_GRADIENT — indigo-600 is
          literally --primary's light-mode value). The from-stop is shared
          by both themes on purpose ("the same brand purple, adapted per
          theme"); only the via/to stops change, since light resolves to
          white and dark resolves to the page's own dark background.
          Dark mode gets a genuine three-stop transition (indigo -> a deeper
          violet midtone -> background) plus a soft screen-blended glow, so
          it reads as a deliberate, lit gradient rather than a flat fade to
          near-black. Content sits in the top portion of the section, inside
          the solid indigo-600 region both themes share, so legibility is
          the same in both.

          dark:-mt-16 dark:pt-16 pulls the section's background up behind the
          sticky header (h-16 = 64px, matching exactly) rather than starting
          where the header ends, so the gradient shows through the header's
          semi-transparent dark:bg-background/70 instead of butting up
          against a solid nav bar with a hard seam. dark:pt-16 on the same
          element restores the padding budget so the inner content below
          still lands at its original position — only the background reaches
          further up. Dark-mode-only: light mode keeps its original opaque
          header and flush hero start, unchanged from before this fix. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-600 via-violet-500 to-white dark:-mt-16 dark:via-violet-900 dark:to-background dark:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(60% 55% at 82% 12%, rgba(196,181,253,0.4), transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 py-16 animate-fade-slide-in sm:px-6 md:py-24 lg:px-8 lg:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">
            Candidate home
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Good roles, clearly tracked.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-indigo-50 sm:text-lg">
            Review open roles, watch your application movement, and keep your
            profile ready for recruiters.
          </p>
          <Link
            to="/jobs"
            className={cn(
              buttonVariants({ size: "lg" }),
              // A fixed indigo-600 rather than the theme-relative text-primary:
              // --primary is a light lavender in dark mode (tuned for text on
              // dark backgrounds elsewhere), which would be low-contrast on
              // this button's white fill.
              "mt-8 w-fit gap-2 bg-white text-indigo-600 transition-transform hover:scale-[1.03] hover:bg-white/90 active:scale-[0.98]",
            )}
          >
            Browse jobs
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 md:space-y-14 md:py-14 lg:px-8">
        {/* Search: filters the same already-fetched jobs list client-side,
            reusing JobFilters from the Jobs listing page rather than a new
            component. */}
        <Reveal>
          <Card className={CARD_DARK_POLISH}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search job titles or companies…"
                  aria-label="Search open jobs"
                  className="h-11 pl-9"
                />
              </div>
              {stackFilters.length > 1 && (
                <JobFilters
                  selectedStack={activeStack}
                  stacks={stackFilters}
                  onStackChange={setSelectedStack}
                />
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Search,
              value: jobsQuery.isLoading
                ? null
                : jobsQuery.isError
                  ? "—"
                  : recommendedJobs.length,
              label: "Open jobs highlighted",
            },
            {
              icon: FileCheck2,
              value: applicationsQuery.isLoading
                ? null
                : applicationsUnavailable
                  ? "—"
                  : activeApplications.length,
              label: "Applications in motion",
            },
            {
              icon: UserRound,
              value: profileCompletionLoading
                ? null
                : profileCompletionUnavailable
                  ? "—"
                  : `${profileCompletion}%`,
              label: "Profile complete",
            },
          ].map(({ icon: Icon, value, label }) => (
            <Card key={label} className={CARD_DARK_POLISH}>
              <CardContent className="flex gap-4 p-5">
                <Icon className="h-9 w-9 text-primary" aria-hidden="true" />
                <div>
                  {value === null ? (
                    <Skeleton className="mb-1 h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-semibold">{value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <Reveal className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Open jobs</h2>
              <Link
                to="/jobs"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </Reveal>
            {jobsQuery.isLoading ? (
              <div
                className="grid gap-4 sm:grid-cols-2"
                aria-label="Loading recommended jobs"
              >
                {[0, 1].map((item) => (
                  <Skeleton key={item} className="h-48 rounded-lg dark:rounded-2xl" />
                ))}
              </div>
            ) : jobsQuery.isError ? (
              <Card role="alert" className={CARD_DARK_POLISH}>
                <CardContent className="flex flex-col items-start gap-4 p-6 dark:p-5">
                  <p className="text-sm text-destructive">
                    {getApiErrorMessage(
                      jobsQuery.error,
                      "Couldn't load open jobs.",
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void jobsQuery.refetch()}
                    disabled={jobsQuery.isFetching}
                  >
                    {jobsQuery.isFetching ? "Trying again…" : "Try again"}
                  </Button>
                </CardContent>
              </Card>
            ) : recommendedJobs.length === 0 ? (
              <Card className={CARD_DARK_POLISH}>
                <CardContent className="p-6 text-sm text-muted-foreground dark:p-5">
                  {jobs.length === 0
                    ? "No open jobs are available right now."
                    : "No jobs match your search."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendedJobs.map((job, index) => (
                  <Reveal key={job.id} delayMs={Math.min(index * 80, 160)}>
                    <JobCard job={job} compact />
                  </Reveal>
                ))}
              </div>
            )}
          </section>

          <Reveal as="aside" delayMs={100} className="space-y-5">
            <Card className={CARD_DARK_POLISH}>
              <CardHeader className="dark:p-5">
                <CardTitle className="text-xl dark:text-2xl">
                  Application status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 dark:p-5 dark:pt-0">
                {applicationsQuery.isLoading ? (
                  [0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-16" />
                  ))
                ) : applicationsUnavailable ? (
                  <div className="space-y-3" role="alert">
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(
                        applicationsQuery.error,
                        "Couldn't load your applications.",
                      )}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void applicationsQuery.refetch()}
                      disabled={applicationsQuery.isFetching}
                    >
                      {applicationsQuery.isFetching
                        ? "Trying again…"
                        : "Try again"}
                    </Button>
                  </div>
                ) : applicationsNeedProfile ? (
                  <p className="text-sm text-muted-foreground">
                    Create your profile before tracking applications.
                  </p>
                ) : applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You have not applied to a role yet.
                  </p>
                ) : (
                  applications.slice(0, 3).map((application) => (
                    <div key={application.id} className="border-l pl-4">
                      <p className="font-medium">{application.job.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {application.job.company.name}
                      </p>
                      <Badge className="mt-2 dark:rounded-full" variant="secondary">
                        {stageLabels[application.stage]}
                      </Badge>
                    </div>
                  ))
                )}
                <Link
                  to="/applications"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full",
                  )}
                >
                  View applications
                </Link>
              </CardContent>
            </Card>

            <Card className={CARD_DARK_POLISH}>
              <CardHeader className="dark:p-5">
                <CardTitle className="text-xl dark:text-2xl">
                  Profile readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="dark:p-5 dark:pt-0">
                {profileCompletionLoading ? (
                  <div className="space-y-3" aria-label="Loading profile readiness">
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : profileCompletionUnavailable ? (
                  <div className="space-y-3" role="alert">
                    <p className="text-sm text-destructive">
                      {getApiErrorMessage(
                        profileUnavailable
                          ? profileQuery.error
                          : experienceQuery.error ?? skillsQuery.error,
                        "Couldn't load your profile readiness.",
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (profileUnavailable) {
                          void profileQuery.refetch();
                          return;
                        }

                        void Promise.all([
                          experienceQuery.refetch(),
                          skillsQuery.refetch(),
                        ]);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                   <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${profileCompletion}%` }}
                    />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {hasProfile
                        ? "Keep your experience, skills, and resume current before applying."
                        : "Create your candidate profile before applying to a role."}
                    </p>
                    <Link
                      to="/profile"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "mt-4 w-full",
                      )}
                    >
                      {hasProfile ? "Review profile" : "Create profile"}
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Recommended for you: reuses the same recommendations cache/API
            (GET /api/candidate/recommendations, via useRecommendations) that
            already powers the Jobs page's "Jobs you might like" panel — no
            new scoring logic. Cards reuse JobCard exactly as "Open jobs"
            does; matched skills (already returned by the API) surface as a
            small badge above each card rather than a new card design. */}
        {!recommendationsQuery.isError && (
          <section>
            <Reveal className="mb-4">
              <h2 className="text-2xl font-semibold">Recommended for you</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on your profile and skills.
              </p>
            </Reveal>

            {recommendationsQuery.isLoading ? (
              <div
                className="grid gap-4 sm:grid-cols-2"
                aria-label="Loading recommended jobs"
              >
                {[0, 1].map((item) => (
                  <Skeleton key={item} className="h-48 rounded-lg dark:rounded-2xl" />
                ))}
              </div>
            ) : recommendationsQuery.data?.status === "computing" &&
              !recommendationsQuery.timedOut ? (
              <Card className={CARD_DARK_POLISH}>
                <CardContent className="flex items-start gap-3 p-6 dark:p-5">
                  <Loader2
                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Finding your matches
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We're scoring open jobs against your profile. This
                      updates on its own in a moment.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : recommendationsQuery.data?.status === "insufficient-profile" ? (
              <Card className={CARD_DARK_POLISH}>
                <CardContent className="flex items-start gap-3 p-6 dark:p-5">
                  <UserRoundPen
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Add a little more to your profile
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add your skills and we can start matching you to open
                      roles.
                    </p>
                    <Link
                      to="/profile"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-3",
                      )}
                    >
                      Complete your profile
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : recommendationCards.length === 0 ? (
              <Card className={CARD_DARK_POLISH}>
                <CardContent className="p-6 dark:p-5">
                  <p className="text-sm text-muted-foreground">
                    No new matches right now — check back soon, or browse all
                    open jobs.
                  </p>
                  <Link
                    to="/jobs"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "mt-3",
                    )}
                  >
                    Browse all jobs
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendationCards.map(({ recommendation, summary }, index) => (
                  <Reveal
                    key={recommendation.jobId}
                    delayMs={Math.min(index * 80, 160)}
                    className="space-y-2"
                  >
                    {recommendation.matchedSkills.length > 0 && (
                      <Badge variant="secondary" className="rounded-full">
                        Matches: {recommendation.matchedSkills.join(", ")}
                      </Badge>
                    )}
                    <JobCard job={summary} compact />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
