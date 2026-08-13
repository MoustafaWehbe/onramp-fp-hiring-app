import { useCountUp } from "../../hooks/useCountUp";

interface CountUpNumberProps {
  value: number;
  durationMs?: number;
  /** Formats the per-frame value (already rounded to `value`'s own decimal
   * precision — see decimalPlaces below) for display, e.g. to add a unit. */
  format?: (value: number) => string;
  className?: string;
}

/**
 * How many decimal places `value` itself is expressed to — 21.5 is 1, 22 is
 * 0. Every animation frame is rounded to this same precision, so an average
 * like 21.5 ticks up smoothly and lands on exactly "21.5" rather than
 * flickering through raw tween floats or losing its fractional part to a
 * blanket Math.round.
 */
function decimalPlaces(value: number): number {
  const [, fraction] = value.toString().split(".");
  return fraction?.length ?? 0;
}

/**
 * A number that counts up to `value` on mount/change instead of appearing
 * instantly — used for dashboard headline stats (time-to-hire, funnel
 * counts, score averages). Thin wrapper around useCountUp so every screen
 * that wants this shares one implementation.
 */
export function CountUpNumber({
  value,
  durationMs,
  format,
  className,
}: CountUpNumberProps) {
  const animated = useCountUp(value, { durationMs });
  const rounded = Number(animated.toFixed(decimalPlaces(value)));
  const display = format ? format(rounded) : String(rounded);

  return <span className={className}>{display}</span>;
}
