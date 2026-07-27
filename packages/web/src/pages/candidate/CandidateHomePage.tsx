import { isAxiosError } from "axios";
import { ArrowRight, FileCheck2, Search, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { JobCard } from "../../components/jobs/JobCard";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useMyApplications } from "../../features/applications/hooks";
import {
  useExperience,
  useProfile,
  useSkills,
} from "../../features/candidate/hooks";
import { usePublicJobs } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { toJobSummary } from "../../lib/job-presentation";
import { cn } from "../../lib/utils";
import type { ApplicationStage } from "../../types/applications";

const stageLabels: Record<ApplicationStage, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  REVIEWED: "In review",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Not selected",
};

export function CandidateHomePage() {
  const jobsQuery = usePublicJobs();
  const applicationsQuery = useMyApplications();
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

  const recommendedJobs = (jobsQuery.data ?? [])
    .slice(0, 3)
    .map(toJobSummary);
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
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Candidate home</p>
            <h1 className="mt-2 text-4xl font-bold">
              Good roles, clearly tracked.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Review open roles, watch your application movement, and keep your
              profile ready for recruiters.
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
            <Card key={label}>
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
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Open jobs</h2>
              <Link
                to="/jobs"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {jobsQuery.isLoading ? (
              <div
                className="grid gap-4 xl:grid-cols-2"
                aria-label="Loading recommended jobs"
              >
                {[0, 1].map((item) => (
                  <Skeleton key={item} className="h-56 rounded-lg" />
                ))}
              </div>
            ) : jobsQuery.isError ? (
              <Card role="alert">
                <CardContent className="flex flex-col items-start gap-4 p-6">
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
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No open jobs are available right now.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {recommendedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Application status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <Badge className="mt-2" variant="secondary">
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

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Profile readiness</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
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
          </aside>
        </div>
      </section>
    </div>
  );
}
