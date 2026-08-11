import { Check, CircleDashed, ExternalLink, Info, Video, X } from "lucide-react";
import { Skeleton } from "../../../components/ui/skeleton";
import { useApplicationTimeline } from "../hooks";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { Timeline, TimelineItem, type TimelineTone } from "./Timeline";
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

/**
 * Reuses the profile's Timeline primitive rather than defining a second
 * timeline design, so a stage change reads the same way as a job or a degree.
 */
function toneFor(
  entry: ApplicationTimelineEntry,
  isLatest: boolean,
): TimelineTone {
  if (entry.toStage === "REJECTED") {
    return "muted";
  }

  return isLatest ? "current" : "accent";
}

function InterviewCallout({
  interviewDate,
  googleMeetLink,
}: {
  interviewDate: string | null;
  googleMeetLink: string | null;
}) {
  if (!interviewDate) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs">
      <p className="flex items-center gap-2 text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
        Interview scheduled for {formatMoment(interviewDate)}
      </p>
      {googleMeetLink && (
        <a
          href={googleMeetLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
        >
          <Video className="h-3.5 w-3.5" aria-hidden="true" />
          Join Google Meet
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
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
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No progress recorded yet. This application is currently{" "}
          {(stageLabels[timeline.currentStage] ?? timeline.currentStage
          ).toLowerCase()}
          .
        </p>
        <InterviewCallout
          interviewDate={timeline.interviewDate}
          googleMeetLink={timeline.googleMeetLink}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Timeline>
        {timeline.entries.map((entry, index) => {
          const isLatest = index === timeline.entries.length - 1;

          return (
            <TimelineItem
              key={entry.id}
              compact
              isLast={isLatest}
              tone={toneFor(entry, isLatest)}
              icon={
                entry.toStage === "REJECTED" ? (
                  <X className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Check className="h-3 w-3" aria-hidden="true" />
                )
              }
              title={stageLabels[entry.toStage] ?? entry.toStage}
              meta={formatMoment(entry.changedAt)}
            />
          );
        })}
      </Timeline>

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

      <InterviewCallout
        interviewDate={timeline.interviewDate}
        googleMeetLink={timeline.googleMeetLink}
      />
    </div>
  );
}
