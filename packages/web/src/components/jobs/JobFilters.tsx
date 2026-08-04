import { Button } from "../ui/button";

interface JobFiltersProps {
  selectedStack: string;
  stacks: readonly string[];
  onStackChange: (stack: string) => void;
}

export function JobFilters({
  selectedStack,
  stacks,
  onStackChange,
}: JobFiltersProps) {
  return (
    <div aria-label="Job filters">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Stacks">
        {stacks.map((stack) => {
          const isSelected = selectedStack === stack;

          return (
            <Button
              key={stack}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => onStackChange(stack)}
              aria-pressed={isSelected}
            >
              {stack}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
