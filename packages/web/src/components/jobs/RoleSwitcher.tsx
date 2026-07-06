import { BriefcaseBusiness, Mic, UserRound } from "lucide-react";
import { cn } from "../../lib/utils";
import type { PlatformRole } from "../../types/users";

export interface RoleOption {
  value: PlatformRole;
  label: string;
  tagline: string;
  description: string;
  icon: typeof UserRound;
}

export const roleOptions: RoleOption[] = [
  {
    value: "candidate",
    label: "Candidate",
    tagline: "Find roles worth your time",
    description:
      "Browse clear roles, track applications, and keep your profile ready.",
    icon: UserRound,
  },
  {
    value: "recruiter",
    label: "Recruiter",
    tagline: "Review talent signals quickly",
    description:
      "Manage jobs, review applicants, and keep the hiring pipeline moving.",
    icon: BriefcaseBusiness,
  },
  {
    value: "interviewer",
    label: "Interviewer",
    tagline: "Prepare structured feedback",
    description:
      "See assigned candidates, upcoming interviews, and pending feedback.",
    icon: Mic,
  },
];

interface RoleSwitcherProps {
  value: PlatformRole;
  onChange: (role: PlatformRole) => void;
  compact?: boolean;
}

export function RoleSwitcher({
  value,
  onChange,
  compact = false,
}: RoleSwitcherProps) {
  return (
    <div
      aria-label="Role view"
      className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "md:grid-cols-3")}
    >
      {roleOptions.map(({ value: role, label, tagline, description, icon: Icon }) => {
        const isActive = value === role;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={isActive}
            className={cn(
              "group flex min-h-40 w-full flex-col rounded-lg border bg-card p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "hover:border-slate-300 hover:bg-background",
              isActive && "border-primary bg-primary/5 shadow-md",
              compact && "min-h-36",
            )}
          >
            <span
              className={cn(
                "mb-4 flex h-11 w-11 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors",
                isActive && "border-primary/30 text-primary",
              )}
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-foreground">
              {label}
            </span>
            <span className="mt-1 text-sm font-medium text-primary">
              {tagline}
            </span>
            <span className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
              {description}
            </span>
            <span className="mt-4 text-sm font-semibold text-foreground">
              {compact ? `View as ${label}` : `Enter as ${label}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
