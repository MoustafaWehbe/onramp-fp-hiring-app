import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type {
  RecruiterApplicationStage,
  RecruiterMutableApplicationStage,
  RecruiterPipelineApplication,
} from "../../../types/applications";
import { PipelineCard } from "./PipelineCard";
import {
  BOARD_STAGES,
  describeRefusedDrop,
  isDroppableStage,
  stageLabels,
} from "./pipeline-board";

interface PipelineBoardProps {
  applications: RecruiterPipelineApplication[];
  movingApplicationId?: string;
  onMove: (
    application: RecruiterPipelineApplication,
    stage: RecruiterMutableApplicationStage,
  ) => void;
  onRefuse: (message: string) => void;
}

function BoardColumn({
  stage,
  applications,
  movingApplicationId,
  isDragging,
}: {
  stage: RecruiterApplicationStage;
  applications: RecruiterPipelineApplication[];
  movingApplicationId?: string;
  isDragging: boolean;
}) {
  const droppable = isDroppableStage(stage);
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !droppable });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${stageLabels[stage]} column`}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        // A clearer "drop here": a stronger indigo border, a tinted fill, and
        // a soft outer ring so the target column reads at a glance.
        isOver &&
          droppable &&
          "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-500/30",
        // Dimming the one column that refuses drops says "not here" during a
        // drag without adding a rule the server doesn't have.
        isDragging && !droppable && "opacity-60",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-3">
        <h3 className="text-base font-semibold">{stageLabels[stage]}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {applications.length}
        </span>
      </header>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        {applications.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">
            {isDragging && droppable ? "Drop here" : "Nobody here yet"}
          </p>
        ) : (
          applications.map((application) => (
            <PipelineCard
              key={application.id}
              application={application}
              isMoving={movingApplicationId === application.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function PipelineBoard({
  applications,
  movingApplicationId,
  onMove,
  onRefuse,
}: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const sensors = useSensors(
    // A small activation distance keeps a click on the card's links from
    // being swallowed as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
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
    // that, and this phase does not persist ordering.
    for (const column of grouped.values()) {
      column.sort((left, right) => (right.fitScore ?? -1) - (left.fitScore ?? -1));
    }

    return grouped;
  }, [applications]);

  const draggingApplication = draggingId
    ? applications.find((application) => application.id === draggingId)
    : undefined;

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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up candidate ${active.id}.`,
          onDragOver: ({ over }) =>
            over
              ? `Over the ${stageLabels[over.id as RecruiterApplicationStage] ?? over.id} column.`
              : "No column.",
          onDragEnd: ({ over }) =>
            over
              ? `Dropped into ${stageLabels[over.id as RecruiterApplicationStage] ?? over.id}.`
              : "Drag cancelled.",
          onDragCancel: () => "Drag cancelled.",
        },
      }}
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {BOARD_STAGES.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              applications={byStage.get(stage) ?? []}
              movingApplicationId={movingApplicationId}
              isDragging={draggingId !== null}
            />
          ))}
        </div>
      </div>

      {/* Rendered outside the scroll container so the card follows the
          cursor across columns instead of being clipped. dropAnimation is
          disabled outright for prefers-reduced-motion, since dnd-kit drives
          it via the Web Animations API rather than a CSS transition/keyframe
          the global reduced-motion rule in globals.css can reach. */}
      <DragOverlay
        dropAnimation={
          reducedMotion
            ? null
            : { duration: 220, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }
        }
      >
        {draggingApplication && (
          <div className="w-72 rotate-1 scale-105 rounded-2xl shadow-xl shadow-indigo-500/25 dark:shadow-indigo-400/20">
            <PipelineCard application={draggingApplication} isMoving={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
