import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { ACCENT_RING_SOFT, TEXT_BODY, TEXT_HEADING, TEXT_META, TIMELINE_RAIL } from "../theme";

/**
 * One vertical timeline, used in three places: profile experience, profile
 * education, and an application's stage progression.
 *
 * It exists as a primitive rather than three lookalike implementations
 * because the brief asks the applications timeline to read as the same
 * pattern as the profile's — which only stays true if they are literally the
 * same component. Callers vary the marker and the content, not the rail.
 */

export type TimelineTone = "accent" | "muted" | "current";

const markerTone: Record<TimelineTone, string> = {
  // Filled: a completed, affirmative step.
  accent: "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-400",
  // Hollow: happened, but not a step forward (a rejection).
  muted:
    "border-stone-300 bg-white text-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-600",
  // Ringed: where things stand right now.
  current: cn(
    "border-indigo-500 bg-white text-indigo-600 ring-4",
    ACCENT_RING_SOFT,
    "dark:border-indigo-400 dark:bg-stone-900 dark:text-indigo-400",
  ),
};

export function Timeline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={cn("relative", className)}>{children}</ol>;
}

export function TimelineItem({
  icon,
  tone = "accent",
  title,
  subtitle,
  meta,
  children,
  actions,
  isLast = false,
  compact = false,
}: {
  icon?: ReactNode;
  tone?: TimelineTone;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Date range or timestamp — the small muted line under the subtitle. */
  meta?: ReactNode;
  children?: ReactNode;
  /** Edit/remove controls, pinned to the right of the row. */
  actions?: ReactNode;
  isLast?: boolean;
  /** Tighter rhythm for the applications list, where space is scarcer. */
  compact?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative flex gap-4",
        compact ? "pb-4 last:pb-0" : "pb-6 last:pb-0",
      )}
    >
      {/* The rail is decorative; the ordered list already conveys sequence. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute w-px",
            TIMELINE_RAIL,
            compact
              ? "left-[11px] top-6 h-[calc(100%-1.5rem)]"
              : "left-[15px] top-8 h-[calc(100%-2rem)]",
          )}
        />
      )}

      <span
        className={cn(
          "z-10 flex shrink-0 items-center justify-center rounded-full border-2",
          compact ? "h-6 w-6" : "h-8 w-8",
          markerTone[tone],
        )}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4
              className={cn(
                "font-semibold",
                TEXT_HEADING,
                compact ? "text-sm" : "text-base",
              )}
            >
              {title}
            </h4>
            {subtitle && (
              <p className={cn("mt-0.5 truncate text-sm", TEXT_BODY)}>
                {subtitle}
              </p>
            )}
            {meta && (
              <p className={cn("mt-0.5 text-xs", TEXT_META)}>{meta}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </div>
        {children && (
          <div
            className={cn(
              "text-sm leading-6",
              TEXT_BODY,
              compact ? "mt-1.5" : "mt-2",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </li>
  );
}
