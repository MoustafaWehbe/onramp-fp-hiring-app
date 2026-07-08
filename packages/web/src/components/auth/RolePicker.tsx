import { BriefcaseBusiness, CheckCircle2, Mic, UserRound } from "lucide-react";
import { PLATFORM_ROLES, roleConfig } from "../../lib/roles";
import { cn } from "../../lib/utils";
import type { PlatformRole } from "../../types/users";

export const roleIcons: Record<PlatformRole, typeof UserRound> = {
  candidate: UserRound,
  recruiter: BriefcaseBusiness,
  interviewer: Mic,
};

interface RolePickerProps {
  value: PlatformRole | null;
  onChange: (role: PlatformRole) => void;
  className?: string;
}

/**
 * Compact role selector for the auth pages. Real buttons in a radiogroup so
 * keyboard and screen-reader users get the same flow as pointer users.
 */
export function RolePicker({ value, onChange, className }: RolePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your workspace role"
      className={cn("grid gap-2", className)}
    >
      {PLATFORM_ROLES.map((role) => {
        const Icon = roleIcons[role];
        const isSelected = value === role;
        const { label, tagline } = roleConfig[role];

        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(role)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors",
              "hover:border-slate-300 hover:bg-accent/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "border-primary bg-primary/5",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground",
                isSelected && "border-primary/30 text-primary",
              )}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {tagline}
              </span>
            </span>
            {isSelected && (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
