import { Loader2, MapPin, Sparkles, UserRoundPen } from "lucide-react";
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

/**
 * "Jobs you might like", sorted by score.
 *
 * Three states matter and are all real: `computing` on a first visit while the
 * background job scores, `insufficient-profile` when there is too little to
 * score honestly, and `ready`. None of them render a blank panel.
 */

function scoreVariant(score: number) {
  if (score >= 75) {
    return "success" as const;
  }

  return score >= 50 ? ("secondary" as const) : ("muted" as const);
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
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/jobs/${job.id}`}
            className="font-medium hover:underline"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {job.company?.name ?? "Company"}
          </p>
        </div>
        <Badge variant={scoreVariant(recommendation.score)}>
          <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {recommendation.score}% match
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(job.location || job.isRemote) && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {job.isRemote ? "Remote" : job.location}
          </span>
        )}
      </div>

      {recommendation.reason && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {recommendation.reason}
        </p>
      )}

      {recommendation.matchedSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recommendation.matchedSkills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      )}
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
