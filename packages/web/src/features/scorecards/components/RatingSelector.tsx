import { cn } from "../../../lib/utils";
import { RATING_MAX, RATING_MIN } from "../../../types/scorecards";

const SCALE = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_value, index) => RATING_MIN + index,
);

interface RatingSelectorProps {
  name: string;
  value: number | null;
  onChange: (rating: number) => void;
  /** Names what is being scored, for screen readers. */
  label: string;
  disabled?: boolean;
}

/**
 * The 1-5 control.
 *
 * Numbers rather than stars: the values are compared and averaged across
 * interviewers, and a row of stars makes people estimate where a number they
 * are about to be held to should be exact. Built as a real radiogroup so
 * arrow keys work and the current value is announced.
 */
export function RatingSelector({
  name,
  value,
  onChange,
  label,
  disabled,
}: RatingSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label={`${label} rating`}
      className="flex items-center gap-1.5"
    >
      {SCALE.map((rating) => {
        const isSelected = value === rating;

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            name={name}
            aria-checked={isSelected}
            aria-label={`${rating} out of ${RATING_MAX}`}
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={cn(
              "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
              "hover:border-primary/50 hover:bg-accent/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isSelected
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary"
                : "bg-background",
            )}
          >
            {rating}
          </button>
        );
      })}
    </div>
  );
}
