import { useDroppable } from "@dnd-kit/core";
import { ChevronsLeftRight, ChevronsRightLeft, UserRoundX } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../../lib/utils";
import type {
  RecruiterApplicationStage,
  RecruiterPipelineApplication,
} from "../../../types/applications";
import { PipelineCard, type PipelineTalentPoolMark } from "./PipelineCard";
import { isDroppableStage, stageLabels } from "./pipeline-board";
import {
  COLUMN_LIST_HEIGHT_CLASS,
  COLUMN_WIDTH_CLASS,
  REFUSED_DROP_CLASS,
  STAGE_THEME,
} from "./pipeline-theme";

/**
 * How many cards a column renders before asking. With the demo data, APPLIED
 * alone holds 80+ applications and every rendered card registers a dnd-kit
 * draggable, so rendering all six columns in full is what makes the board feel
 * heavy. A batch is used rather than a windowing library because the column is
 * the drop target, not the card: see the note on `useDroppable` below.
 */
export const INITIAL_VISIBLE_CARDS = 25;

/** How many more each press of "Load more" reveals. */
const LOAD_MORE_STEP = 25;

export interface PipelineColumnProps {
  stage: RecruiterApplicationStage;
  applications: RecruiterPipelineApplication[];
  movingApplicationId?: string;
  /** The stage the in-flight card started in, or null when nothing is moving. */
  draggingFromStage: RecruiterApplicationStage | null;
  isPro: boolean;
  talentPoolByProfileId?: Map<string, PipelineTalentPoolMark>;
  collapsed: boolean;
  onToggleCollapsed: (stage: RecruiterApplicationStage) => void;
}

export function PipelineColumn({
  stage,
  applications,
  movingApplicationId,
  draggingFromStage,
  isPro,
  talentPoolByProfileId,
  collapsed,
  onToggleCollapsed,
}: PipelineColumnProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);
  const theme = STAGE_THEME[stage];
  const droppable = isDroppableStage(stage);
  const isDragging = draggingFromStage !== null;

  /*
   * The droppable is the column, not the card list and not any individual
   * card. That is what makes the batching above safe: dnd-kit measures this
   * one rect, so a card can be dropped onto a column holding eighty
   * applications while only twenty-five of them are mounted. Nothing about the
   * drop depends on the target's children existing.
   *
   * It stays enabled for APPLIED — the one stage nothing can move back into —
   * on purpose. A disabled droppable would simply never register as `over`,
   * and the drop would fail silently; leaving it live means `onDragEnd` can
   * refuse it out loud with the shared reason string. The visual treatment
   * below says "not here" before the drop is ever made.
   */
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Once the list shrinks back under a batch (a filter tightened, cards moved
  // on), forget that "Load more" was ever pressed, so re-widening the filter
  // starts from a fast board again instead of an 80-card column.
  useEffect(() => {
    if (applications.length <= INITIAL_VISIBLE_CARDS) {
      setVisibleCount(INITIAL_VISIBLE_CARDS);
    }
  }, [applications.length]);

  const visible = applications.slice(0, visibleCount);
  const hidden = applications.length - visible.length;
  const isOrigin = stage === draggingFromStage;
  const showAsRefused = isDragging && !droppable && !isOrigin;
  const showAsTarget = isOver && droppable && !isOrigin;

  if (collapsed) {
    return (
      <CollapsedColumn
        stage={stage}
        count={applications.length}
        isOver={showAsTarget}
        onExpand={() => onToggleCollapsed(stage)}
        setNodeRef={setNodeRef}
      />
    );
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={`${stageLabels[stage]} column`}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl border transition-colors duration-150",
        COLUMN_WIDTH_CLASS,
        theme.surface,
        theme.border,
        showAsTarget && theme.dropActive,
        showAsRefused && REFUSED_DROP_CLASS,
      )}
    >
      {/* Top accent bar: the stage colour at full strength, above a header
          that sits outside the scroll container below — so it stays put while
          the card list moves under it. */}
      <span aria-hidden="true" className={cn("h-1 w-full shrink-0", theme.accent)} />

      <header className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <span
          aria-hidden="true"
          className={cn("h-2 w-2 shrink-0 rounded-full", theme.accent)}
        />
        <h3
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide",
            theme.headerText,
          )}
        >
          {stageLabels[stage]}
        </h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            theme.countBadge,
          )}
        >
          {applications.length}
        </span>
        <button
          type="button"
          onClick={() => onToggleCollapsed(stage)}
          aria-label={`Collapse ${stageLabels[stage]} column`}
          className="-mr-1 rounded p-1 text-muted-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10"
        >
          <ChevronsRightLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      {/* `flex-1` against the board row's stretch alignment: every column is
          as tall as the fullest one, so an empty stage is a full-height drop
          target rather than a 100px sliver you have to aim at. */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2",
          COLUMN_LIST_HEIGHT_CLASS,
        )}
      >
        {applications.length === 0 ? (
          <EmptyColumn stage={stage} isTarget={showAsTarget} />
        ) : (
          <>
            {visible.map((application) => (
              <PipelineCard
                key={application.id}
                application={application}
                isMoving={movingApplicationId === application.id}
                isPro={isPro}
                talentPool={talentPoolByProfileId?.get(
                  application.candidateProfileId,
                )}
              />
            ))}

            {hidden > 0 && (
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) => count + LOAD_MORE_STEP)
                }
                className={cn(
                  "shrink-0 rounded-xl border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/10",
                  theme.border,
                )}
              >
                Load {Math.min(hidden, LOAD_MORE_STEP)} more
                <span className="sr-only"> in {stageLabels[stage]}</span>
                <span className="ml-1 opacity-70">({hidden} hidden)</span>
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * A designed placeholder rather than blank space — an empty column should
 * still look like a column, and during a drag it doubles as the drop hint.
 */
function EmptyColumn({
  stage,
  isTarget,
}: {
  stage: RecruiterApplicationStage;
  isTarget: boolean;
}) {
  const theme = STAGE_THEME[stage];

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-center transition-colors",
        theme.border,
        isTarget && "bg-black/[0.03] dark:bg-white/[0.04]",
      )}
    >
      <UserRoundX
        className="h-5 w-5 text-muted-foreground/50"
        aria-hidden="true"
      />
      <p className="text-xs text-muted-foreground">
        {isTarget ? "Drop here" : "Nobody here yet"}
      </p>
    </div>
  );
}

/**
 * The collapsed rail. Still a live drop target: a recruiter who has hidden
 * REJECTED to focus on the shortlist should not have to re-open it to reject
 * someone.
 */
function CollapsedColumn({
  stage,
  count,
  isOver,
  onExpand,
  setNodeRef,
}: {
  stage: RecruiterApplicationStage;
  count: number;
  isOver: boolean;
  onExpand: () => void;
  setNodeRef: (element: HTMLElement | null) => void;
}) {
  const theme = STAGE_THEME[stage];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${stageLabels[stage]} column, collapsed`}
      className={cn(
        "flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-2xl border transition-colors duration-150",
        theme.surface,
        theme.border,
        isOver && theme.dropActive,
      )}
    >
      <span aria-hidden="true" className={cn("h-1 w-full shrink-0", theme.accent)} />
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${stageLabels[stage]} column`}
        className="flex flex-1 flex-col items-center gap-3 px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <ChevronsLeftRight
          className="h-3.5 w-3.5 text-muted-foreground/70"
          aria-hidden="true"
        />
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
            theme.countBadge,
          )}
        >
          {count}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "whitespace-nowrap text-xs font-semibold uppercase tracking-wide [writing-mode:vertical-rl]",
            theme.headerText,
          )}
        >
          {stageLabels[stage]}
        </span>
      </button>
    </section>
  );
}
