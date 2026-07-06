import { BriefcaseBusiness, Mic, UserRound } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export type HiringRole = "Candidate" | "Recruiter" | "Interviewer";

const roleOptions: Array<{
  label: HiringRole;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    label: "Candidate",
    description: "Find roles worth your time.",
    icon: UserRound,
  },
  {
    label: "Recruiter",
    description: "Review talent signals quickly.",
    icon: BriefcaseBusiness,
  },
  {
    label: "Interviewer",
    description: "Prepare structured feedback.",
    icon: Mic,
  },
];

interface RoleSwitcherProps {
  value: HiringRole;
  onChange: (role: HiringRole) => void;
}

export function RoleSwitcher({ value, onChange }: RoleSwitcherProps) {
  return (
    <div aria-label="Role view" className="grid gap-2 sm:grid-cols-3">
      {roleOptions.map(({ label, description, icon: Icon }) => {
        const isActive = value === label;

        return (
          <Button
            key={label}
            type="button"
            variant="outline"
            onClick={() => onChange(label)}
            aria-pressed={isActive}
            className={cn(
              "h-auto justify-start gap-3 whitespace-normal border bg-background px-3 py-3 text-left",
              isActive &&
                "border-primary bg-primary/5 text-primary shadow-sm",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground",
                isActive && "border-primary/30 text-primary",
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {description}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}
