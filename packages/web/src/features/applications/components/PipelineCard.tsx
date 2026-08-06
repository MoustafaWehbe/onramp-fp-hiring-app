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
import { cn } from "../../../lib/utils";
import type { RecruiterPipelineApplication } from "../../../types/applications";
import { formatInterviewDate } from "../interview-date";

function FitScoreBadge({
  application,
}: {
  application: RecruiterPipelineApplication;
}) {
  if (
    application.aiScoringStatus === "completed" &&
    application.fitScore !== null
  ) {
    return (
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
}: {
  summary: RecruiterPipelineApplication["scorecardSummary"];
}) {
  if (!summary || summary.scorecardCount === 0 || summary.averageRating === null) {
    return (
      <Badge variant="muted">
        <ClipboardList className="mr-1 h-3 w-3" aria-hidden="true" />
        No scorecards
      </Badge>
    );
  }

  return (
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
}

export function PipelineCard({
  application,
  isMoving,
}: {
  application: RecruiterPipelineApplication;
  isMoving: boolean;
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
        "rounded-md border bg-background p-3 shadow-sm",
        isDragging && "opacity-50",
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
        <FitScoreBadge application={application} />
        <ScorecardBadge summary={application.scorecardSummary} />
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
