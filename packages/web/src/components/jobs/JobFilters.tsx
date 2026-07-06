import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { JobStatus } from "../../types/jobs";

export type StatusFilter = JobStatus | "all";

interface JobFiltersProps {
  selectedStatus: StatusFilter;
  selectedStack: string;
  stacks: readonly string[];
  onStatusChange: (status: StatusFilter) => void;
  onStackChange: (stack: string) => void;
}

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
  { label: "All", value: "all" },
];

export function JobFilters({
  selectedStatus,
  selectedStack,
  stacks,
  onStatusChange,
  onStackChange,
}: JobFiltersProps) {
  return (
    <div className="space-y-4" aria-label="Job filters">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Status">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={selectedStatus === filter.value ? "default" : "outline"}
            onClick={() => onStatusChange(filter.value)}
            aria-pressed={selectedStatus === filter.value}
            className="min-w-20"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="list" aria-label="Stacks">
        {stacks.map((stack) => {
          const isSelected = selectedStack === stack;

          return (
            <button
              key={stack}
              type="button"
              onClick={() => onStackChange(stack)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-border bg-card text-muted-foreground hover:border-slate-300 hover:text-foreground",
              )}
            >
              {stack}
            </button>
          );
        })}
      </div>
    </div>
  );
}
