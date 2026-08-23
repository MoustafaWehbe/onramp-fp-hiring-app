import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type ClientRect,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type {
  RecruiterApplicationStage,
  RecruiterMutableApplicationStage,
  RecruiterPipelineApplication,
} from "../../../types/applications";
import {
  PipelineCardPreview,
  type PipelineTalentPoolMark,
} from "./PipelineCard";
import { PipelineColumn } from "./PipelineColumn";
import {
  BOARD_STAGES,
  describeRefusedDrop,
  isDroppableStage,
  stageLabels,
} from "./pipeline-board";
import { COLUMN_WIDTH_CLASS } from "./pipeline-theme";

const COLLAPSED_STORAGE_KEY = "hireflow.pipelineCollapsedStages";

interface PipelineBoardProps {
  applications: RecruiterPipelineApplication[];
  movingApplicationId?: string;
  isPro: boolean;
  /** Talent-pool membership keyed by candidate profile id, when known. */
  talentPoolByProfileId?: Map<string, PipelineTalentPoolMark>;
  onMove: (
    application: RecruiterPipelineApplication,
    stage: RecruiterMutableApplicationStage,
  ) => void;
  onRefuse: (message: string) => void;
}

/**
 * Which columns the recruiter has folded away, persisted across reloads with
 * the same best-effort localStorage pattern as the sidebar's collapsed state.
 * Hiding REJECTED to work the live shortlist is a working preference, not a
 * per-visit one.
 */
function useCollapsedStages(): [
  Set<RecruiterApplicationStage>,
  (stage: RecruiterApplicationStage) => void,
] {
  const [collapsed, setCollapsed] = useState<Set<RecruiterApplicationStage>>(
    () => {
      if (typeof window === "undefined") return new Set();

      try {
        const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (!stored) return new Set();

        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) return new Set();

        return new Set(
          parsed.filter((stage): stage is RecruiterApplicationStage =>
            (BOARD_STAGES as string[]).includes(stage as string),
          ),
        );
      } catch {
        return new Set();
      }
    },
  );

  const toggle = useCallback((stage: RecruiterApplicationStage) => {
    setCollapsed((previous) => {
      const next = new Set(previous);

      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }

      try {
        window.localStorage.setItem(
          COLLAPSED_STORAGE_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        // Storage unavailable (private mode, etc.) — best-effort persistence.
      }

      return next;
    });
  }, []);

  return [collapsed, toggle];
}

/**
 * Pointer position first for a mouse, nearest centre for a keyboard.
 *
 * The default (`rectIntersection`) compares the dragged card's box against
 * each column's, which with six tall adjacent columns keeps resolving to
 * whichever one the card's corner clipped rather than the one under the
 * cursor. `pointerWithin` is exact for mouse and touch, and `rectIntersection`
 * backs it up so a pointer in the gap between two columns still resolves.
 *
 * A keyboard drag has no pointer at all — `pointerCoordinates` is null, which
 * is how this tells the two apart. It cannot use overlap either: a card is
 * 19rem wide and a collapsed column is a 3rem rail, so the card always
 * overlaps the rail's neighbour more than the rail itself. Nearest centre is
 * the measure that matches what the arrow keys are actually doing below.
 */
const boardCollisionDetection: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) {
    return closestCenter(args);
  }

  const pointerCollisions = pointerWithin(args);

  return pointerCollisions.length > 0
    ? pointerCollisions
    : rectIntersection(args);
};

/**
 * Arrow keys move a card one *column* at a time.
 *
 * dnd-kit's default keyboard getter translates by 25px per press, which is
 * fine for a sortable list and useless here: crossing a 19rem column would
 * take a dozen presses, and nothing would tell the user when they had
 * arrived. This snaps the card to the next column in board order instead, so
 * one press is one stage — the keyboard equivalent of the drag a mouse user
 * makes in one gesture.
 */
const boardKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context: { collisionRect, droppableRects } },
) => {
  const step =
    event.code === KeyboardCode.Right
      ? 1
      : event.code === KeyboardCode.Left
        ? -1
        : 0;

  if (step === 0 || !collisionRect) {
    return;
  }

  event.preventDefault();

  // Board order, restricted to the columns dnd-kit has actually measured.
  const columns = BOARD_STAGES.map((stage) => droppableRects.get(stage)).filter(
    (rect): rect is ClientRect => rect !== undefined,
  );

  if (columns.length === 0) {
    return;
  }

  const cardCentre = collisionRect.left + collisionRect.width / 2;
  let current = 0;

  columns.forEach((rect, index) => {
    const distance = Math.abs(rect.left + rect.width / 2 - cardCentre);
    const best = columns[current];

    if (
      best === undefined ||
      distance < Math.abs(best.left + best.width / 2 - cardCentre)
    ) {
      current = index;
    }
  });

  const target = columns[Math.min(columns.length - 1, Math.max(0, current + step))];

  if (!target) {
    return;
  }

  return {
    x: target.left + (target.width - collisionRect.width) / 2,
    y: target.top + 24,
  };
};

export function PipelineBoard({
  applications,
  movingApplicationId,
  isPro,
  talentPoolByProfileId,
  onMove,
  onRefuse,
}: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [collapsedStages, toggleCollapsed] = useCollapsedStages();
  const reducedMotion = useReducedMotion();

  const sensors = useSensors(
    // A small activation distance keeps a click on the card's links from
    // being swallowed as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
    }),
  );

  const byStage = useMemo(() => {
    const grouped = new Map<
      RecruiterApplicationStage,
      RecruiterPipelineApplication[]
    >(BOARD_STAGES.map((stage) => [stage, []]));

    for (const application of applications) {
      grouped.get(application.stage)?.push(application);
    }

    // Highest fit first inside a column; position carries no meaning beyond
    // that, and this phase does not persist ordering. It also decides which
    // cards a batched column renders first, so the strongest candidates are
    // the ones on screen before "Load more" is ever pressed.
    for (const column of grouped.values()) {
      column.sort((left, right) => (right.fitScore ?? -1) - (left.fitScore ?? -1));
    }

    return grouped;
  }, [applications]);

  const draggingApplication = draggingId
    ? applications.find((application) => application.id === draggingId)
    : undefined;
  const draggingFromStage = draggingApplication?.stage ?? null;

  function nameOf(id: string | number): string {
    return (
      applications.find((application) => application.id === String(id))
        ?.candidateProfile.user.name ?? "candidate"
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);

    const overId = event.over?.id;

    if (!overId) {
      return;
    }

    const application = applications.find(
      (candidate) => candidate.id === String(event.active.id),
    );

    if (!application) {
      return;
    }

    const targetStage = String(overId) as RecruiterApplicationStage;

    // Dropping a card back where it came from is a no-op, not a request.
    if (targetStage === application.stage) {
      return;
    }

    if (!isDroppableStage(targetStage)) {
      onRefuse(describeRefusedDrop(targetStage));
      return;
    }

    onMove(application, targetStage);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
          onDragOver: ({ over }) => {
            if (!over) return "Not over a column.";

            const stage = over.id as RecruiterApplicationStage;
            const label = stageLabels[stage] ?? String(over.id);

            // The refusal the board draws for APPLIED is spoken too, so a
            // keyboard user learns it at the same moment a mouse user sees it
            // — before the drop, not as a toast after it.
            return isDroppableStage(stage)
              ? `Over the ${label} column.`
              : `Over the ${label} column, which does not accept moves.`;
          },
          onDragEnd: ({ active, over }) =>
            over
              ? `${nameOf(active.id)} dropped into ${
                  stageLabels[over.id as RecruiterApplicationStage] ?? over.id
                }.`
              : "Drag cancelled.",
          onDragCancel: ({ active }) =>
            `Drag of ${nameOf(active.id)} cancelled.`,
        },
      }}
    >
      {/* The board is the one recruiter surface that scrolls sideways as a
          group; each column then scrolls vertically on its own. */}
      <div className="overflow-x-auto pb-3">
        {/* Stretch alignment, not `items-start`: all six columns take the
            height of the fullest, which keeps the board rectangular and — more
            importantly — makes a stage with two cards in it just as easy to
            drop onto as a stage with eighty. */}
        <div className="flex min-w-max items-stretch gap-3">
          {BOARD_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              applications={byStage.get(stage) ?? []}
              movingApplicationId={movingApplicationId}
              draggingFromStage={draggingFromStage}
              isPro={isPro}
              talentPoolByProfileId={talentPoolByProfileId}
              collapsed={collapsedStages.has(stage)}
              onToggleCollapsed={toggleCollapsed}
            />
          ))}
        </div>
      </div>

      {/* Rendered outside the scroll container so the card follows the cursor
          across columns instead of being clipped. Both the lift and the settle
          are dropped for prefers-reduced-motion: dnd-kit drives the settle via
          the Web Animations API rather than a CSS transition the global
          reduced-motion rule in globals.css can reach. */}
      <DragOverlay
        dropAnimation={
          reducedMotion
            ? null
            : { duration: 220, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }
        }
      >
        {draggingApplication && (
          <div
            className={cn(
              COLUMN_WIDTH_CLASS,
              "cursor-grabbing rounded-2xl",
              !reducedMotion &&
                "rotate-2 scale-[1.03] shadow-2xl shadow-indigo-500/30 dark:shadow-indigo-400/25",
            )}
          >
            <PipelineCardPreview
              application={draggingApplication}
              isMoving={false}
              isPro={isPro}
              talentPool={talentPoolByProfileId?.get(
                draggingApplication.candidateProfileId,
              )}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
