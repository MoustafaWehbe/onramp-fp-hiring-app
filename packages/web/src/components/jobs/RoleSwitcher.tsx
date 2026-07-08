import { ArrowRight } from "lucide-react";
import { roleIcons } from "../auth/RolePicker";
import { PLATFORM_ROLES, roleConfig } from "../../lib/roles";
import { cn } from "../../lib/utils";
import type { PlatformRole } from "../../types/users";

interface RoleSwitcherProps {
  value: PlatformRole | null;
  onChange: (role: PlatformRole) => void;
  compact?: boolean;
  /** CTA prefix, e.g. "Continue as" -> "Continue as Candidate". */
  ctaPrefix?: string;
}

/**
 * Role cards used on the homepage ("Continue as …") and the jobs page
 * ("View as …", compact). Equal-height, keyboard-focusable real buttons.
 */
export function RoleSwitcher({
  value,
  onChange,
  compact = false,
  ctaPrefix,
}: RoleSwitcherProps) {
  const ctaText = ctaPrefix ?? (compact ? "View as" : "Continue as");

  return (
    <div
      aria-label="Choose your role"
      className={cn("grid gap-3", compact ? "sm:grid-cols-3" : "md:grid-cols-3")}
    >
      {PLATFORM_ROLES.map((role) => {
        const { label, tagline, description } = roleConfig[role];
        const Icon = roleIcons[role];
        const isActive = value === role;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={isActive}
            className={cn(
              "group flex w-full flex-col rounded-lg border bg-card p-5 text-left shadow-sm transition-all",
              "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive &&
                "border-primary bg-primary/5 shadow-md ring-1 ring-primary/40",
              compact ? "min-h-36 p-4" : "min-h-48",
            )}
          >
            <span
              className={cn(
                "mb-4 flex h-11 w-11 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors",
                "group-hover:text-foreground",
                isActive && "border-primary/30 bg-primary/10 text-primary",
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
            {!compact && (
              <span className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                {description}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-semibold text-foreground",
                compact ? "mt-3" : "mt-5",
              )}
            >
              {ctaText} {label.toLowerCase()}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
