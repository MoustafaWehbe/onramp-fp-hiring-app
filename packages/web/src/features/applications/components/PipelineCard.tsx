import { useDraggable } from "@dnd-kit/core";
import {
  CalendarCheck,
  ClipboardList,
  GripVertical,
  Loader2,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { LockedBadge } from "../../../components/shared/LockedFeatureState";
import { cn } from "../../../lib/utils";
import { CARD_CLASS, CARD_HOVER_CLASS } from "../../candidate/theme";
import type { RecruiterPipelineApplication } from "../../../types/applications";
import { formatInterviewDate } from "../interview-date";

function FitScoreBadge({
  application,
  isPro,
}: {
  application: RecruiterPipelineApplication;
  isPro: boolean;
}) {
  if (
    application.aiScoringStatus === "completed" &&
    application.fitScore !== null
  ) {
    const badge = (
      <Badge
        variant={
          application.fitScore >= 75
            ? "success"
            : application.fitScore >= 50
              ? "secondary"
              : "muted"
        }
      >
        <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
        {application.fitScore}% fit
      </Badge>
    );

    // AI fit scoring is a Pro feature. The score already exists on this
    // application (Free companies just never had it scheduled) — locking it
    // visually rather than hiding the badge keeps this honest about what's
    // actually gated.
    return isPro ? (
      badge
    ) : (
      <LockedBadge label="Fit score — upgrade to Pro to view">
        {badge}
      </LockedBadge>
    );
  }

  if (application.aiScoringStatus === "pending") {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
        Scoring
      </Badge>
    );
  }

  return <Badge variant="muted">Not scored</Badge>;
}

/**
 * The human counterpart to the AI fit score sitting next to it.
 *
 * Shows the count as well as the average so a 4.5 from one interviewer is not
 * mistaken for a 4.5 the whole panel agreed on — and stays visible with "No
 * scorecards" when there are none, since silence about an unevaluated
 * candidate is what lets them sit in a column unnoticed.
 */
function ScorecardBadge({
  summary,
  isPro,
}: {
  summary: RecruiterPipelineApplication["scorecardSummary"];
  isPro: boolean;
}) {
  if (!summary || summary.scorecardCount === 0 || summary.averageRating === null) {
    return (
      <Badge variant="muted">
        <ClipboardList className="mr-1 h-3 w-3" aria-hidden="true" />
        No scorecards
      </Badge>
    );
  }

  const badge = (
    <Badge
      variant={summary.averageRating >= 4 ? "success" : "secondary"}
      title={`Average of ${summary.scorecardCount} scorecard${
        summary.scorecardCount === 1 ? "" : "s"
      }`}
    >
      <ClipboardList className="mr-1 h-3 w-3" aria-hidden="true" />
      {summary.averageRating.toFixed(1)}/5 · {summary.scorecardCount}
    </Badge>
  );

  // Interview scorecards are a Pro feature — see the equivalent comment on
  // FitScoreBadge above.
  return isPro ? (
    badge
  ) : (
    <LockedBadge label="Scorecard average — upgrade to Pro to view">
      {badge}
    </LockedBadge>
  );
}

export function PipelineCard({
  application,
  isMoving,
  isPro,
}: {
  application: RecruiterPipelineApplication;
  isMoving: boolean;
  isPro: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: application.id,
      data: { stage: application.stage },
    });
  const { candidateProfile } = application;

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            }
          : undefined
      }
      className={cn(
        CARD_CLASS,
        // Hover-lift is suppressed while this card is the one being
        // dragged — it already has its own drag-overlay clone to carry
        // motion, so a competing translate here would fight the drag.
        !isDragging && CARD_HOVER_CLASS,
        "p-3",
        isDragging && "scale-95 opacity-40",
        isMoving && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          // The drag handle is a real button so the card is reachable by
          // keyboard: dnd-kit binds space/arrow keys to it.
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Move ${candidateProfile.user.name}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <Link
            to={`/recruiter/candidates/${candidateProfile.id}`}
            className="block truncate font-medium hover:underline"
          >
            {candidateProfile.user.name}
          </Link>
          {candidateProfile.headline && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {candidateProfile.headline}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <FitScoreBadge application={application} isPro={isPro} />
        <ScorecardBadge summary={application.scorecardSummary} isPro={isPro} />
        {application.interviewDate && (
          <Badge
            variant="outline"
            title={`Interview ${formatInterviewDate(application.interviewDate)}`}
          >
            <CalendarCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            {formatInterviewDate(application.interviewDate)}
          </Badge>
        )}
        {application.recruiterNotes && (
          <Badge variant="outline" title={application.recruiterNotes}>
            <NotebookPen className="mr-1 h-3 w-3" aria-hidden="true" />
            Notes
          </Badge>
        )}
      </div>

      {isMoving && (
        <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
      )}
    </div>
  );
}
