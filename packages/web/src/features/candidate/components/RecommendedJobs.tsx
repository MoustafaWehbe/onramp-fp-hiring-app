import { Building2, Loader2, MapPin, UserRoundPen } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { buttonVariants } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { useRecommendations } from "../hooks";
import type { JobRecommendation } from "../../../types/candidate";
import { ACCENT_CHIP } from "../theme";
/**
 * "Jobs you might like", sorted by score.
 *
 * Three states matter and are all real: `computing` on a first visit while the
 * background job scores, `insufficient-profile` when there is too little to
 * score honestly, and `ready`. None of them render a blank panel.
 */

/**
 * The match score as a ring rather than a bare number: the arc conveys
 * magnitude at a glance and the number stays readable inside it.
 *
 * Drawn with an SVG circle and stroke-dasharray so it needs no chart library
 * and no layout shift while it renders.
 */
function MatchRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const stroke =
    score >= 75
      ? "stroke-emerald-500"
      : score >= 50
        ? "stroke-indigo-500"
        : "stroke-stone-400";

  return (
    <div
      className="relative h-12 w-12 shrink-0"
      role="img"
      aria-label={`${score}% match`}
    >
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-stone-200"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={cn("transition-[stroke-dashoffset] duration-500", stroke)}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-stone-700"
        aria-hidden="true"
      >
        {score}
      </span>
    </div>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: JobRecommendation;
}) {
  const { job } = recommendation;

  if (!job) {
    return null;
  }

  return (
    // Mirrors the JobCard pattern used elsewhere: bordered card, company
    // above title, hover border shift.
    <div className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-indigo-300">
      <div className="flex items-start gap-4">
        <MatchRing score={recommendation.score} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm ${TEXT_META}">
            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{job.company?.name ?? "Company"}</span>
          </div>
          <h3 className="mt-1 text-base font-semibold leading-6 ${TEXT_HEADING}">
            <Link
              to={`/jobs/${job.id}`}
              className="rounded-sm outline-none hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              {job.title}
            </Link>
          </h3>

          {(job.location || job.isRemote) && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm ${TEXT_META}">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {job.isRemote ? "Remote" : job.location}
            </p>
          )}

          {recommendation.reason && (
            <p className="mt-2 text-sm leading-6 ${TEXT_BODY}">
              {recommendation.reason}
            </p>
          )}

          {recommendation.matchedSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recommendation.matchedSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={cn("rounded-full", ACCENT_CHIP)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecommendedJobs({ limit = 4 }: { limit?: number }) {
  const recommendationsQuery = useRecommendations(limit);

  // A candidate with no profile 404s here; that is handled by the profile
  // prompt on the page itself rather than by an error card.
  if (recommendationsQuery.isError) {
    return null;
  }

  const data = recommendationsQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Jobs you might like</CardTitle>
        <p className="text-sm text-muted-foreground">
          Matched against your profile, highest first.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendationsQuery.isLoading && (
          <div className="space-y-3" aria-label="Loading recommendations">
            <Skeleton className="h-24 rounded-md" />
            <Skeleton className="h-24 rounded-md" />
          </div>
        )}

        {data?.status === "computing" && (
          <div className="flex items-start gap-3 rounded-md border border-dashed p-4">
            <Loader2
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">Finding your matches</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We're scoring open jobs against your profile. This updates on
                its own in a moment.
              </p>
            </div>
          </div>
        )}

        {data?.status === "insufficient-profile" && (
          <div className="flex items-start gap-3 rounded-md border border-dashed p-4">
            <UserRoundPen
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">
                Add a little more to your profile
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your skills and we can start matching you to open roles.
              </p>
              <Link
                to="/candidate/profile"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-3",
                )}
              >
                Complete your profile
              </Link>
            </div>
          </div>
        )}

        {data?.status === "ready" && data.recommendations.length === 0 && (
          <div className="rounded-md border border-dashed p-4">
            <p className="text-sm font-medium">No new matches right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You've applied to the open roles that fit your profile. New
              postings will show up here.
            </p>
          </div>
        )}

        {data?.recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.jobId}
            recommendation={recommendation}
          />
        ))}
      </CardContent>
    </Card>
  );
}
