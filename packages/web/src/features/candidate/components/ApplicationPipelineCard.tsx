import { isAxiosError } from "axios";
import { Check, ChevronDown, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useMyApplications } from "../../applications/hooks";
import { useIsMdUp } from "../../../hooks/useIsMdUp";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { cn } from "../../../lib/utils";
import type { ApplicationStage, CandidateApplication } from "../../../types/applications";
import { ProfileSection } from "./ProfileSection";
import { TEXT_HEADING, TEXT_META } from "../theme";

/**
 * The forward stages of a pipeline, in order. DRAFT precedes this (an
 * application that hasn't been submitted yet has no pipeline to show) and
 * REJECTED is a terminal off-ramp rather than a step along it — both are
 * handled separately from this fixed track.
 */
const PIPELINE_STAGES = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
] as const satisfies readonly ApplicationStage[];

const STAGE_LABELS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
};

type StageTone = "completed" | "current" | "upcoming";

function toneFor(index: number, currentIndex: number): StageTone {
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "upcoming";
}

const CIRCLE_BASE =
  "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-all duration-300";

const circleTone: Record<StageTone, string> = {
  completed:
    "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-stone-950",
  // A gradient fill rather than a flat one, so the active stage reads as a
  // smoother, richer transition instead of a plain color swap — the same
  // indigo-to-violet pairing already used for the app's other accent fills.
  current:
    "border-transparent bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 dark:from-indigo-400 dark:to-violet-400 dark:text-stone-950 dark:shadow-indigo-400/20",
  upcoming:
    "border-stone-200 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-600",
};

const labelTone: Record<StageTone, string> = {
  completed: TEXT_HEADING,
  current: "text-indigo-600 dark:text-indigo-400",
  upcoming: TEXT_META,
};

/**
 * The stage-stepper visual. Reads top-to-bottom as progress through the
 * pipeline: a filled checkmark for a stage already cleared, a gradient-
 * filled, numbered marker for the stage the application sits in now, and a
 * hollow, muted marker for what's still ahead. A short connecting segment
 * sits between each pair of circles — indigo once progress has passed it,
 * muted otherwise — rather than one continuous rail running the full
 * length. A rejected application keeps only "Applied" marked complete —
 * the rest is genuinely unknown, not fabricated as reached.
 */
function PipelineStages({
  application,
}: {
  application: CandidateApplication;
}) {
  const isRejected = application.stage === "REJECTED";
  // -1 for a stray DRAFT/REJECTED value too, same as "not found" — the
  // caller filters DRAFT out and isRejected already branches REJECTED away
  // above, so in practice this only ever resolves a forward stage.
  const currentIndex = isRejected
    ? -1
    : PIPELINE_STAGES.indexOf(
        application.stage as (typeof PIPELINE_STAGES)[number],
      );

  return (
    <div>
      <ol>
        {PIPELINE_STAGES.map((stage, index) => {
          const tone = isRejected
            ? index === 0
              ? "completed"
              : "upcoming"
            : toneFor(index, currentIndex);
          const isCurrent = tone === "current";
          const isLast = index === PIPELINE_STAGES.length - 1;
          // The segment below this circle has been "passed" once this
          // stage itself is cleared — i.e. progress has moved on from it.
          const connectorPassed = tone === "completed";

          return (
            <li key={stage} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn(CIRCLE_BASE, circleTone[tone])}>
                  {tone === "completed" ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "my-1 h-4 w-0.5 shrink-0 rounded-full transition-colors duration-500",
                      connectorPassed
                        ? "bg-indigo-500 dark:bg-indigo-400"
                        : "bg-stone-200 dark:bg-stone-800",
                    )}
                  />
                )}
              </div>
              <div
                className={cn(
                  "flex h-9 min-w-0 flex-col justify-center",
                  !isLast && "pb-5",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold",
                    labelTone[tone],
                  )}
                >
                  {STAGE_LABELS[stage]}
                </p>
                {isCurrent && (
                  <p className={cn("text-xs", TEXT_META)}>
                    Current stage
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isRejected && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <span>
            Not moving forward on this one — new roles from{" "}
            {application.job.company.name} will show up here as they open.
          </span>
        </div>
      )}
    </div>
  );
}

function ApplicationPicker({
  applications,
  selectedId,
  onChange,
}: {
  applications: CandidateApplication[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Choose an application to track"
        className="flex h-11 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {applications.map((application) => (
          <option key={application.id} value={application.id}>
            {application.job.title} · {application.job.company.name}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

export function ApplicationPipelineCard() {
  const isMdUp = useIsMdUp();
  // enabled: isMdUp — the query itself never fires below md, not just the
  // markup that would have shown its result.
  const applicationsQuery = useMyApplications(isMdUp);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const profileMissing =
    isAxiosError(applicationsQuery.error) &&
    applicationsQuery.error.response?.status === 404;
  const applicationsUnavailable = applicationsQuery.isError && !profileMissing;

  // A draft hasn't actually been submitted, so it has no pipeline to track.
  // Memoized so the effect below only re-derives its default when the
  // underlying data actually changes, not on every render.
  const trackableApplications = useMemo(
    () =>
      (applicationsQuery.data ?? []).filter(
        (application) => application.stage !== "DRAFT",
      ),
    [applicationsQuery.data],
  );

  useEffect(() => {
    if (trackableApplications.length === 0) {
      return;
    }
    setSelectedId((current) =>
      current && trackableApplications.some((a) => a.id === current)
        ? current
        : trackableApplications[0].id,
    );
  }, [trackableApplications]);

  if (!isMdUp) {
    return null;
  }

  const selectedApplication =
    trackableApplications.find((a) => a.id === selectedId) ??
    trackableApplications[0];

  return (
    <ProfileSection
      icon={Route}
      title="Application Pipeline"
      description="Track where each application stands, stage by stage."
    >
      {applicationsQuery.isLoading ? (
        <div className="space-y-4" aria-label="Loading application pipeline">
          <Skeleton className="h-11 w-full rounded-md" />
          <div>
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex flex-col items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                {item < 2 && <Skeleton className="my-1 h-4 w-0.5" />}
              </div>
            ))}
          </div>
        </div>
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
            {applicationsQuery.isFetching ? "Trying again…" : "Try again"}
          </Button>
        </div>
      ) : profileMissing ? (
        <p className={cn("text-sm", TEXT_META)}>
          Complete your candidate profile above to start applying to roles.
        </p>
      ) : trackableApplications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-200 p-6 text-center dark:border-stone-800">
          <p className={cn("text-sm", TEXT_META)}>
            Apply to jobs to track your pipeline here.
          </p>
          <Link
            to="/jobs"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3",
            )}
          >
            Browse jobs
          </Link>
        </div>
      ) : selectedApplication ? (
        <div className="space-y-6">
          <ApplicationPicker
            applications={trackableApplications}
            selectedId={selectedApplication.id}
            onChange={setSelectedId}
          />
          {/* Keyed by application id so switching selections remounts this
              block and replays the fade/slide-in, rather than the stages
              snapping straight to their new state. */}
          <div key={selectedApplication.id} className="animate-fade-slide-in">
            <PipelineStages application={selectedApplication} />
          </div>
        </div>
      ) : null}
    </ProfileSection>
  );
}
