import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

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
  accent: "border-indigo-500 bg-indigo-500 text-white",
  // Hollow: happened, but not a step forward (a rejection).
  muted: "border-stone-300 bg-white text-stone-400",
  // Ringed: where things stand right now.
  current: "border-indigo-500 bg-white text-indigo-600 ring-4 ring-indigo-100",
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
            "absolute w-px bg-stone-200",
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
                "font-semibold text-stone-900",
                compact ? "text-sm" : "text-base",
              )}
            >
              {title}
            </h4>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-stone-600">
                {subtitle}
              </p>
            )}
            {meta && (
              <p className="mt-0.5 text-xs text-stone-500">{meta}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          )}
        </div>
        {children && (
          <div
            className={cn(
              "text-sm leading-6 text-stone-600",
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
