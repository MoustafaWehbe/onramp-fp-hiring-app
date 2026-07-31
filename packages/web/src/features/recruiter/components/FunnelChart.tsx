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
import type { FunnelStageStats } from "../../../types/analytics";
import {
  axisTickStyle,
  CHART_TOKENS,
  ChartEmptyState,
  ChartTooltipCard,
} from "./charts";

const stageLabels: Record<FunnelStageStats["stage"], string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
};

interface FunnelChartProps {
  stages: FunnelStageStats[];
  rejected: number;
  totalApplications: number;
}

export function FunnelChart({
  stages,
  rejected,
  totalApplications,
}: FunnelChartProps) {
  if (totalApplications === 0) {
    return (
      <ChartEmptyState title="No applications yet">
        The funnel fills in as candidates apply to your company's jobs.
      </ChartEmptyState>
    );
  }

  const data = stages.map((stage) => ({
    ...stage,
    label: stageLabels[stage.stage],
  }));

  return (
    <div className="space-y-4">
      {/* Horizontal: stage names are long, and reading down a funnel matches
          how the pipeline itself is read. */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid
            horizontal={false}
            stroke={CHART_TOKENS.grid}
            strokeWidth={1}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={axisTickStyle}
            stroke={CHART_TOKENS.axis}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tick={axisTickStyle}
            stroke={CHART_TOKENS.axis}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", fillOpacity: 0.35 }}
            content={({ active, payload }) => {
              const entry = payload?.[0]?.payload as
                | (FunnelStageStats & { label: string })
                | undefined;

              if (!active || !entry) {
                return null;
              }

              return (
                <ChartTooltipCard
                  label={entry.label}
                  rows={[
                    { name: "Reached", value: String(entry.reached) },
                    { name: "Currently here", value: String(entry.count) },
                    {
                      name: "Of all applications",
                      value: `${entry.reachedPercentage}%`,
                    },
                    ...(entry.conversionFromPrevious === null
                      ? []
                      : [
                          {
                            name: "From previous stage",
                            value: `${entry.conversionFromPrevious}%`,
                          },
                        ]),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="reached" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              // Ordered stages, so the ordinal ramp encodes position in the
              // funnel rather than repeating the bar length as hue.
              <Cell
                key={entry.stage}
                fill={CHART_TOKENS.ordinal[index % CHART_TOKENS.ordinal.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Funnel conversion by stage
          </caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 font-medium">
                Stage
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Reached
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Here now
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                From previous
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.stage} className="border-b last:border-0">
                <th scope="row" className="py-2 text-left font-normal">
                  {entry.label}
                </th>
                <td className="py-2 text-right tabular-nums">
                  {entry.reached}
                </td>
                <td className="py-2 text-right tabular-nums">{entry.count}</td>
                <td className="py-2 text-right tabular-nums">
                  {entry.conversionFromPrevious === null
                    ? "—"
                    : `${entry.conversionFromPrevious}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {rejected} rejected. Reached counts anyone at a stage or past it;
        rejections aren't attributed to the stage they left from.
      </p>
    </div>
  );
}
