import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreDistributionStats } from "../../../types/analytics";
import { CountUpNumber } from "../../../components/shared/CountUpNumber";
import {
  axisTickStyle,
  CHART_TOKENS,
  ChartEmptyState,
  ChartTooltipCard,
} from "./charts";

export function ScoreDistributionChart({
  distribution,
}: {
  distribution: ScoreDistributionStats;
}) {
  if (distribution.scoredCount === 0) {
    return (
      <ChartEmptyState title="No scored applications yet">
        {distribution.unscoredCount > 0
          ? `${distribution.unscoredCount} application${
              distribution.unscoredCount === 1 ? "" : "s"
            } are waiting on an AI fit score. The histogram appears once scoring completes.`
          : "Fit scores are generated when candidates apply with a CV."}
      </ChartEmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={distribution.buckets}
          margin={{ top: 12, right: 8, bottom: 4, left: 0 }}
          barCategoryGap="22%"
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
            allowDecimals={false}
            tick={axisTickStyle}
            stroke={CHART_TOKENS.axis}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.35 }}
            content={({ active, payload }) => {
              const entry = payload?.[0]?.payload as
                | ScoreDistributionStats["buckets"][number]
                | undefined;

              if (!active || !entry) {
                return null;
              }

              return (
                <ChartTooltipCard
                  label={`Fit score ${entry.label}`}
                  rows={[
                    {
                      name: "Applications",
                      value: String(entry.count),
                    },
                    {
                      name: "Share of scored",
                      value: `${Math.round(
                        (entry.count / distribution.scoredCount) * 100,
                      )}%`,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {distribution.buckets.map((bucket, index) => (
              // Score bands are ordered, so a higher band reads darker.
              <Cell
                key={bucket.label}
                fill={CHART_TOKENS.ordinal[index % CHART_TOKENS.ordinal.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          Average{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {distribution.averageScore === null ? (
              "—"
            ) : (
              <CountUpNumber value={distribution.averageScore} />
            )}
          </span>
        </span>
        <span>
          Median{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {distribution.medianScore === null ? (
              "—"
            ) : (
              <CountUpNumber value={distribution.medianScore} />
            )}
          </span>
        </span>
        <span>
          Scored{" "}
          <span className="font-semibold text-foreground tabular-nums">
            <CountUpNumber value={distribution.scoredCount} />
          </span>
        </span>
        {distribution.unscoredCount > 0 && (
          <span>
            Awaiting a score{" "}
            <span className="font-semibold text-foreground tabular-nums">
              <CountUpNumber value={distribution.unscoredCount} />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
