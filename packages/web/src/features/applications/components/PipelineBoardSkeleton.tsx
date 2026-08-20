import { Skeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/utils";
import { BOARD_STAGES, stageLabels } from "./pipeline-board";
import { COLUMN_WIDTH_CLASS, STAGE_THEME } from "./pipeline-theme";

/**
 * How many placeholder cards each column shows while loading. Uneven on
 * purpose — six identical columns read as a rendering artefact, whereas a
 * funnel shape reads as a pipeline that is about to arrive.
 */
const SKELETON_CARDS: Record<string, number> = {
  APPLIED: 5,
  REVIEWED: 4,
  INTERVIEWING: 3,
  OFFER: 2,
  HIRED: 1,
  REJECTED: 2,
};

/**
 * The loading board: real columns, in their real stage colours, with skeleton
 * cards inside them. The alternative — six grey rectangles, or nothing at all
 * — throws the whole layout away and then snaps it back, which on a board this
 * wide is the most jarring moment on the page.
 */
export function PipelineBoardSkeleton() {
  return (
    <div className="overflow-x-auto pb-3" aria-label="Loading pipeline">
      <div className="flex min-w-max items-stretch gap-3">
        {BOARD_STAGES.map((stage) => {
          const theme = STAGE_THEME[stage];

          return (
            <section
              key={stage}
              className={cn(
                "flex shrink-0 flex-col overflow-hidden rounded-2xl border",
                COLUMN_WIDTH_CLASS,
                theme.surface,
                theme.border,
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-1 w-full shrink-0", theme.accent)}
              />
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
                <Skeleton className="h-5 w-6 rounded-full" />
              </header>

              <div className="flex flex-col gap-2 px-2 pb-2">
                {Array.from({ length: SKELETON_CARDS[stage] ?? 2 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[4.75rem] w-full rounded-2xl"
                    />
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
