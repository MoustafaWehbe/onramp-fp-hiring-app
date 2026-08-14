import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeToHireStats } from "../../../types/analytics";
import {
  axisTickStyle,
  CHART_TOKENS,
  ChartEmptyState,
  ChartTooltipCard,
  StatTile,
} from "./charts";

function formatDays(days: number | null): string {
  if (days === null) {
    return "—";
  }

  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, monthNumber - 1, 1));
}

export function TimeToHireCard({ timeToHire }: { timeToHire: TimeToHireStats }) {
  if (timeToHire.hiredCount === 0) {
    return (
      <ChartEmptyState title="Not enough completed hires yet">
        Time-to-hire is measured from a candidate applying to being marked
        hired. It appears once your first candidate reaches the hired stage.
      </ChartEmptyState>
    );
  }

  const trend = timeToHire.trend.map((point) => ({
    ...point,
    label: formatMonth(point.month),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Average"
          value={formatDays(timeToHire.averageDays)}
          countUp={
            timeToHire.averageDays === null
              ? undefined
              : {
                  target: timeToHire.averageDays,
                  format: (n) => formatDays(n),
                }
          }
        />
        <StatTile
          label="Median"
          value={formatDays(timeToHire.medianDays)}
          countUp={
            timeToHire.medianDays === null
              ? undefined
              : {
                  target: timeToHire.medianDays,
                  format: (n) => formatDays(n),
                }
          }
        />
        <StatTile
          label="Fastest"
          value={formatDays(timeToHire.fastestDays)}
          countUp={
            timeToHire.fastestDays === null
              ? undefined
              : {
                  target: timeToHire.fastestDays,
                  format: (n) => formatDays(n),
                }
          }
        />
        <StatTile
          label="Hires measured"
          value={String(timeToHire.hiredCount)}
          countUp={{ target: timeToHire.hiredCount }}
        />
      </div>

      {/* A trend needs at least two points to be a trend. One hire is already
          reported by the tiles above. */}
      {trend.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          A month-by-month trend appears once you have hires in more than one
          month.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={trend}
            margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={CHART_TOKENS.grid}
              strokeWidth={1}
            />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              stroke={CHART_TOKENS.axis}
              tickLine={false}
            />
            <YAxis
              tick={axisTickStyle}
              stroke={CHART_TOKENS.axis}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: CHART_TOKENS.grid, strokeWidth: 1 }}
              content={({ active, payload }) => {
                const entry = payload?.[0]?.payload as
                  | (typeof trend)[number]
                  | undefined;

                if (!active || !entry) {
                  return null;
                }

                return (
                  <ChartTooltipCard
                    label={entry.label}
                    rows={[
                      {
                        name: "Average time to hire",
                        value: formatDays(entry.averageDays),
                      },
                      { name: "Hires", value: String(entry.hires) },
                    ]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="averageDays"
              stroke={CHART_TOKENS.series}
              strokeWidth={2}
              dot={{ r: 4, fill: CHART_TOKENS.series, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
