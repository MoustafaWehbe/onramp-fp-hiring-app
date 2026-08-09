import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { cn, formatDate } from "../../../lib/utils";
import {
  RATING_MAX,
  type InterviewScorecard,
  type ScorecardAggregate,
} from "../../../types/scorecards";

/** Shared wording so the badge, the headline and the empty state agree. */
export function formatAverage(average: number | null): string {
  return average === null ? "—" : `${average.toFixed(1)}/${RATING_MAX}`;
}

function toneFor(average: number | null): "success" | "secondary" | "muted" {
  if (average === null) {
    return "muted";
  }
  if (average >= 4) {
    return "success";
  }
  return average >= 3 ? "secondary" : "muted";
}

function ScorecardEntry({ scorecard }: { scorecard: InterviewScorecard }) {
  const [isOpen, setIsOpen] = useState(false);
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <li className="rounded-md border bg-background">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Chevron
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {scorecard.interviewerName}
          </span>
          <span className="block text-xs text-muted-foreground">
            {scorecard.templateTitle} · {formatDate(scorecard.submittedAt)}
          </span>
        </span>
        <Badge variant={toneFor(scorecard.averageRating)}>
          {formatAverage(scorecard.averageRating)}
        </Badge>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t p-3">
          {scorecard.ratings.map((rating) => (
            <div key={rating.criterionId} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{rating.criterionLabel}</span>
                <span className="tabular-nums text-muted-foreground">
                  {rating.rating}/{RATING_MAX}
                </span>
              </div>
              {rating.comment && (
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {rating.comment}
                </p>
              )}
            </div>
          ))}

          {scorecard.overallComment && (
            <div className="border-t pt-3 text-sm">
              <p className="font-medium">Overall</p>
              <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                {scorecard.overallComment}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The aggregate, then who made it.
 *
 * Averages lead because that is the number a hiring decision gets summarised
 * to, but each submission stays one click away — an average of 3 built from a
 * 5 and a 1 is a very different conversation from two 3s, and collapsing that
 * away would hide the disagreement worth talking about.
 */
export function ScorecardAggregateView({
  aggregate,
}: {
  aggregate: ScorecardAggregate;
}) {
  if (aggregate.scorecardCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No scorecards submitted yet. The first submission below sets the
        average.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums">
          {formatAverage(aggregate.overallAverage)}
        </span>
        <span className="text-sm text-muted-foreground">
          overall, from {aggregate.scorecardCount}{" "}
          {aggregate.scorecardCount === 1 ? "scorecard" : "scorecards"}
        </span>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        {aggregate.criteriaAverages.map((criterion) => (
          <div
            key={criterion.criterionId}
            className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2"
          >
            <dt className="min-w-0 text-sm">
              <span className="block truncate">{criterion.criterionLabel}</span>
              <span className="block text-xs text-muted-foreground">
                {criterion.ratingCount}{" "}
                {criterion.ratingCount === 1 ? "rating" : "ratings"}
              </span>
            </dt>
            <dd
              className={cn(
                "shrink-0 text-lg font-semibold tabular-nums",
                criterion.averageRating >= 4 && "text-emerald-600",
              )}
            >
              {criterion.averageRating.toFixed(1)}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="text-sm font-medium">Individual submissions</p>
        <ul className="mt-2 space-y-2">
          {aggregate.scorecards.map((scorecard) => (
            <ScorecardEntry key={scorecard.id} scorecard={scorecard} />
          ))}
        </ul>
      </div>
    </div>
  );
}
