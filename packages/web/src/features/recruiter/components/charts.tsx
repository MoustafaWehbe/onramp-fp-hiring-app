import type { ReactNode } from "react";

/**
 * Chart chrome shared by the analytics charts.
 *
 * The colours come from the CSS custom properties defined in globals.css so
 * the ramp is declared once and follows the theme, rather than being hardcoded
 * per chart. Recharts needs concrete strings, so they are read at render time.
 */
export const CHART_TOKENS = {
  series: "var(--chart-series)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  label: "var(--chart-label)",
  ordinal: [
    "var(--chart-ordinal-1)",
    "var(--chart-ordinal-2)",
    "var(--chart-ordinal-3)",
    "var(--chart-ordinal-4)",
    "var(--chart-ordinal-5)",
  ],
} as const;

/** Axis ticks and labels wear ink tokens, never a series colour. */
export const axisTickStyle = {
  fill: CHART_TOKENS.label,
  fontSize: 12,
} as const;

/**
 * Shown instead of an axis-and-no-marks chart. An empty plot reads as a
 * rendering failure; a stated reason reads as a fact about the data.
 */
export function ChartEmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function ChartTooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: Array<{ name: string; value: string }>;
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <dl className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <div key={row.name} className="flex gap-3 text-xs">
            <dt className="text-muted-foreground">{row.name}</dt>
            <dd className="ml-auto font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * A single number is a stat tile, not a one-bar chart — the average and
 * median time-to-hire are exactly that case.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
