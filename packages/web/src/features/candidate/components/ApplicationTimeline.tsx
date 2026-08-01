import { Check, CircleDashed, Info, X } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { useApplicationTimeline } from "../hooks";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { cn } from "../../../lib/utils";
import type { ApplicationTimelineEntry } from "../../../types/candidate";

/**
 * The candidate's view of their own progress.
 *
 * It renders only what the timeline endpoint returns: stages and timestamps.
 * Fit score, AI summary, and recruiter notes are absent from the response and
 * from the types, so there is nothing here that could leak them.
 */

const stageLabels: Record<string, string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Not moving forward",
};

function formatMoment(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function EntryIcon({ stage }: { stage: string }) {
  if (stage === "REJECTED") {
    return <X className="h-3.5 w-3.5" aria-hidden="true" />;
  }

  return <Check className="h-3.5 w-3.5" aria-hidden="true" />;
}

function TimelineEntry({
  entry,
  isLatest,
}: {
  entry: ApplicationTimelineEntry;
  isLatest: boolean;
}) {
  const isRejection = entry.toStage === "REJECTED";

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* The rail is decorative; the ordered list carries the sequence. */}
      <span
        className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-border last:hidden"
        aria-hidden="true"
      />
      <span
        className={cn(
          "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isRejection
            ? "bg-muted text-muted-foreground"
            : isLatest
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary",
        )}
      >
        <EntryIcon stage={entry.toStage} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium">
          {stageLabels[entry.toStage] ?? entry.toStage}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatMoment(entry.changedAt)}
        </p>
      </div>
    </li>
  );
}

export function ApplicationTimeline({
  applicationId,
  enabled = true,
}: {
  applicationId: string;
  enabled?: boolean;
}) {
  const timelineQuery = useApplicationTimeline(applicationId, enabled);

  if (timelineQuery.isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading application timeline">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-36" />
      </div>
    );
  }

  if (timelineQuery.isError || !timelineQuery.data) {
    return (
      <p className="text-sm text-muted-foreground" role="alert">
        {getApiErrorMessage(
          timelineQuery.error,
          "Couldn't load this application's progress.",
        )}
      </p>
    );
  }

  const timeline = timelineQuery.data;

  if (timeline.entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No progress recorded yet. This application is currently{" "}
        {(stageLabels[timeline.currentStage] ?? timeline.currentStage
        ).toLowerCase()}
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="relative">
        {timeline.entries.map((entry, index) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLatest={index === timeline.entries.length - 1}
          />
        ))}
      </ol>

      {/* An application that moved before history existed would otherwise look
          like it had never progressed. */}
      {!timeline.hasCompleteHistory && (
        <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            This application is currently{" "}
            <span className="font-medium">
              {(
                stageLabels[timeline.currentStage] ?? timeline.currentStage
              ).toLowerCase()}
            </span>
            . Detailed progress has been tracked from this point forward.
          </span>
        </p>
      )}

      {timeline.interviewDate && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
          Interview scheduled for {formatMoment(timeline.interviewDate)}
        </p>
      )}
    </div>
  );
}
