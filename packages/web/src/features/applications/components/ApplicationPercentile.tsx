import { TrendingUp } from "lucide-react";
import { cn } from "../../../lib/utils";
import { TEXT_META } from "../../candidate/theme";

interface ApplicationPercentileProps {
  isPending: boolean;
  /** Undefined covers both "not resolved yet" and "resolved with nothing to show" — both render nothing once isPending is false. */
  percentile?: number;
  className?: string;
}

/**
 * Purely presentational: JobDetailPage owns triggering the percentile
 * computation exactly once, right after a successful apply, and just hands
 * this component the resulting mutation state. Renders nothing once
 * resolved with no percentile — no resume text to score, or a transient AI
 * failure — since this is a bonus on top of a successful application, never
 * something that should read as an error.
 */
export function ApplicationPercentile({
  isPending,
  percentile,
  className,
}: ApplicationPercentileProps) {
  if (isPending) {
    return (
      <p
        className={cn("flex items-center gap-2 text-sm", TEXT_META, className)}
        role="status"
      >
        <TrendingUp className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
        Calculating how you compare to other applicants…
      </p>
    );
  }

  if (percentile === undefined) {
    return null;
  }

  return (
    <p
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300",
        className,
      )}
      role="status"
    >
      <TrendingUp className="h-4 w-4 shrink-0" aria-hidden="true" />
      You&rsquo;re in the top {percentile}% of applicants for this job.
    </p>
  );
}
