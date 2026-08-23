import { useDraggable } from "@dnd-kit/core";
import {
  CalendarCheck,
  ClipboardList,
  GripVertical,
  Loader2,
  NotebookPen,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LockedBadge } from "../../../components/shared/LockedFeatureState";
import { cn } from "../../../lib/utils";
import { ProfileAvatar } from "../../candidate/components/ProfileSection";
import { CARD_CLASS, CARD_HOVER_CLASS } from "../../candidate/theme";
import type {
  RecruiterApplicationStage,
  RecruiterPipelineApplication,
} from "../../../types/applications";
import {
  formatInterviewDate,
  formatInterviewDateShort,
} from "../interview-date";
import { FIT_SCORE_TIER_CLASS, STAGE_THEME, fitScoreTier } from "./pipeline-theme";

/** Talent-pool membership for one candidate, joined in by the page. */
export interface PipelineTalentPoolMark {
  tagLabels: string[];
}

/** Shared chrome for the fit pill, so all four states are the same size. */
const FIT_PILL_CLASS =
  "inline-flex h-6 min-w-[2.5rem] shrink-0 items-center justify-center gap-0.5 rounded-full border px-1.5 text-xs font-bold tabular-nums";

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
    const score = application.fitScore;
    const badge = (
      <span
        className={cn(FIT_PILL_CLASS, FIT_SCORE_TIER_CLASS[fitScoreTier(score)])}
        title={`AI fit score: ${score}%`}
      >
        {/* The digits carry the weight visually; the unit and the word "fit"
            live in the screen-reader label instead, because at this density a
            three-character pill is the difference between a card that scans
            and a card that wraps. */}
        <span aria-hidden="true">{score}</span>
        <span className="sr-only">{score}% fit</span>
      </span>
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
      <span
        className={cn(
          FIT_PILL_CLASS,
          "border-dashed border-slate-300 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400",
        )}
        title="This application's fit score is still being calculated"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        <span className="sr-only">Scoring</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        FIT_PILL_CLASS,
        "border-dashed border-slate-300 bg-transparent text-slate-400 dark:border-slate-700 dark:text-slate-500",
      )}
      title="This application has no fit score"
    >
      <span aria-hidden="true">–</span>
      <span className="sr-only">Not scored</span>
    </span>
  );
}

/**
 * One icon-led marker in the card's indicator row.
 *
 * Icons rather than text labels, because six columns of cards can only spare
 * one line for this. Nothing is lost to a sighted-mouse user (`title` carries
 * the full detail) or to a screen reader (`sr-only` carries the same thing as
 * real text), so the compression is presentational only.
 */
function Indicator({
  icon: Icon,
  label,
  detail,
  value,
  className,
}: {
  icon: LucideIcon;
  /** The screen-reader text. Keep it short — it is read out verbatim. */
  label: string;
  /** The mouse tooltip. Falls back to `label`. */
  detail?: string;
  /** Optional glanceable text beside the icon. */
  value?: string;
  className?: string;
}) {
  return (
    <span
      title={detail ?? label}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-transparent bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground dark:bg-white/[0.06]",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden={true} />
      {value && (
        <span className="truncate tabular-nums" aria-hidden="true">
          {value}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Stages a panel has already met the candidate in. */
function hasBeenInterviewed(stage: RecruiterApplicationStage): boolean {
  return stage === "INTERVIEWING" || stage === "OFFER" || stage === "HIRED";
}

function hasScorecardRatings(
  summary: RecruiterPipelineApplication["scorecardSummary"],
): summary is { scorecardCount: number; averageRating: number } {
  return (
    summary !== undefined &&
    summary.scorecardCount > 0 &&
    summary.averageRating !== null
  );
}

/**
 * The human counterpart to the AI fit score.
 *
 * Shows the count alongside the average so a 4.5 from one interviewer is not
 * mistaken for a 4.5 the whole panel agreed on. Its caller only renders it
 * once there are ratings or the candidate has reached a stage a panel has met
 * them in: an unscored candidate in INTERVIEWING is worth flagging, but eighty
 * APPLIED cards each announcing "no scorecards" would drown the markers that
 * do mean something.
 */
function ScorecardIndicator({
  summary,
  isPro,
}: {
  summary: RecruiterPipelineApplication["scorecardSummary"];
  isPro: boolean;
}) {
  if (!hasScorecardRatings(summary)) {
    return (
      <Indicator
        icon={ClipboardList}
        label="No scorecards"
        detail="No interview scorecards submitted yet"
        className="border-dashed border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400"
      />
    );
  }

  const indicator = (
    <Indicator
      icon={ClipboardList}
      label={`Scorecard average ${summary.averageRating.toFixed(1)} out of 5`}
      detail={`Average of ${summary.scorecardCount} scorecard${
        summary.scorecardCount === 1 ? "" : "s"
      }: ${summary.averageRating.toFixed(1)}/5`}
      value={summary.averageRating.toFixed(1)}
      className={cn(
        summary.averageRating >= 4 &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    />
  );

  // Interview scorecards are a Pro feature — see FitScoreBadge above.
  return isPro ? (
    indicator
  ) : (
    <LockedBadge label="Scorecard average — upgrade to Pro to view">
      {indicator}
    </LockedBadge>
  );
}

interface PipelineCardProps {
  application: RecruiterPipelineApplication;
  isMoving: boolean;
  isPro: boolean;
  talentPool?: PipelineTalentPoolMark;
}

/**
 * A card inside a column: the presentational shell below, wired to dnd-kit.
 *
 * The drag overlay deliberately renders `PipelineCardPreview` instead of this
 * component. Mounting a second `useDraggable` under the same application id
 * while that id is the active drag would both clobber the source's registered
 * node and report `isDragging` on the clone — which, now that `isDragging`
 * turns a card into an empty placeholder well, would make the card you are
 * dragging vanish under the cursor.
 */
export function PipelineCard({
  application,
  isMoving,
  isPro,
  talentPool,
}: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    data: { stage: application.stage },
  });

  return (
    <PipelineCardShell
      application={application}
      isMoving={isMoving}
      isPro={isPro}
      talentPool={talentPool}
      isPlaceholder={isDragging}
      containerRef={setNodeRef}
      handleProps={{ ...listeners, ...attributes }}
    />
  );
}

/** The card as it appears under the cursor mid-drag: no dnd-kit registration. */
export function PipelineCardPreview(props: PipelineCardProps) {
  return <PipelineCardShell {...props} isPlaceholder={false} />;
}

function PipelineCardShell({
  application,
  isMoving,
  isPro,
  talentPool,
  isPlaceholder,
  containerRef,
  handleProps,
}: PipelineCardProps & {
  /** True for the card left behind at the drag's origin. */
  isPlaceholder: boolean;
  containerRef?: (element: HTMLElement | null) => void;
  handleProps?: Record<string, unknown>;
}) {
  const { candidateProfile } = application;
  const theme = STAGE_THEME[application.stage];
  const isDragging = isPlaceholder;

  return (
    <article
      ref={containerRef}
      aria-label={candidateProfile.user.name}
      className={cn(
        CARD_CLASS,
        "group relative border",
        // Hover-lift is suppressed while this card is the one being dragged —
        // the drag overlay clone carries the motion, and a competing
        // translate here would fight it.
        !isDragging && CARD_HOVER_CLASS,
        // The origin of a drag becomes a placeholder gap rather than a hole:
        // the real content stays in the DOM under `invisible` so the slot keeps
        // its exact height, and the card outline turns into a dashed well.
        isDragging &&
          "border-2 border-dashed border-slate-300 bg-slate-50 shadow-none dark:border-slate-700 dark:bg-slate-900/40",
        isMoving && "opacity-60",
      )}
    >
      {/* The stage accent, tying the card to the column it sits in. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-1 rounded-full",
          theme.cardAccent,
          isDragging && "hidden",
        )}
      />

      <div className={cn("flex items-stretch", isDragging && "invisible")}>
        <button
          type="button"
          // A real button so the card is reachable by keyboard: dnd-kit binds
          // space and the arrow keys to it. Stretched down the card's left
          // edge so grabbing feels like grabbing the card, not hitting a
          // 16-pixel target.
          className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-2xl text-muted-foreground/40 opacity-70 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-hover:opacity-100 active:cursor-grabbing"
          aria-label={`Move ${candidateProfile.user.name}`}
          {...handleProps}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 py-2.5 pr-2.5">
          <div className="flex items-start gap-2">
            <ProfileAvatar
              name={candidateProfile.user.name}
              className="mt-0.5 h-8 w-8 shrink-0 text-[11px]"
            />

            <div className="min-w-0 flex-1">
              <Link
                to={`/recruiter/candidates/${candidateProfile.id}`}
                className="block truncate text-sm font-semibold leading-5 hover:underline"
              >
                {candidateProfile.user.name}
              </Link>
              {candidateProfile.headline && (
                <p className="truncate text-xs leading-4 text-muted-foreground">
                  {candidateProfile.headline}
                </p>
              )}
            </div>

            <FitScoreBadge application={application} isPro={isPro} />
          </div>

          <IndicatorRow
            application={application}
            isPro={isPro}
            talentPool={talentPool}
          />

          {isMoving && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Saving…</p>
          )}
        </div>
      </div>
    </article>
  );
}

function IndicatorRow({
  application,
  isPro,
  talentPool,
}: {
  application: RecruiterPipelineApplication;
  isPro: boolean;
  talentPool?: PipelineTalentPoolMark;
}) {
  const indicators: ReactNode[] = [];

  if (application.interviewDate) {
    indicators.push(
      <Indicator
        key="interview"
        icon={CalendarCheck}
        label={`Interview ${formatInterviewDate(application.interviewDate)}`}
        detail={`Interview scheduled for ${formatInterviewDate(
          application.interviewDate,
        )}`}
        value={formatInterviewDateShort(application.interviewDate)}
        className="bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
      />,
    );
  }

  if (application.recruiterNotes) {
    indicators.push(
      <Indicator
        key="notes"
        icon={NotebookPen}
        label="Notes"
        detail={application.recruiterNotes}
      />,
    );
  }

  if (talentPool) {
    indicators.push(
      <Indicator
        key="pool"
        icon={Star}
        label="In talent pool"
        detail={
          talentPool.tagLabels.length > 0
            ? `In talent pool — ${talentPool.tagLabels.join(", ")}`
            : "In talent pool"
        }
        value={
          talentPool.tagLabels.length > 0
            ? talentPool.tagLabels[0]
            : undefined
        }
        className="max-w-[8rem] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      />,
    );
  }

  const showScorecard =
    hasScorecardRatings(application.scorecardSummary) ||
    hasBeenInterviewed(application.stage);

  // Nothing to say about this candidate yet — an empty row would still claim
  // its top margin, so drop it entirely rather than leave a gap.
  if (indicators.length === 0 && !showScorecard) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {indicators}
      {showScorecard && (
        <ScorecardIndicator
          summary={application.scorecardSummary}
          isPro={isPro}
        />
      )}
    </div>
  );
}
