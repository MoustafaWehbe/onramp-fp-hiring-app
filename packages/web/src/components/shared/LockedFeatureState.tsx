import { Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { buttonVariants } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import { ACCENT_SURFACE, ACCENT_TEXT, CARD_CLASS } from "../../features/candidate/theme";

interface LockedFeatureStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

/**
 * Full-panel "this is a Pro feature" state — replaces a gated page or widget
 * entirely, rather than hiding it. Used wherever a whole page or section is
 * Pro-only: Talent Pool, Scorecard Templates, the TalentPoolSection and
 * ScorecardPanel widgets on the candidate detail page, and the recruiter
 * candidate-recommendations placeholder.
 */
export function LockedFeatureState({
  icon: Icon,
  title,
  description,
  className,
}: LockedFeatureStateProps) {
  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            ACCENT_SURFACE,
          )}
          aria-hidden="true"
        >
          <Icon className={cn("h-6 w-6", ACCENT_TEXT)} />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          to="/recruiter/upgrade"
          className={cn(buttonVariants(), "mt-1 gap-2")}
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          Upgrade to Pro
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Inline lock for a small piece of already-fetched data (a fit-score or
 * scorecard-average badge). The server does not redact this data for Free
 * companies — see the note in requirePro.ts — so hiding it outright would
 * misrepresent what's actually locked: the *view*, not the data. Blurring
 * the real value and overlaying a lock glyph says "this exists, upgrade to
 * see it" without fabricating a placeholder or exposing the number.
 */
export function LockedBadge({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <span className="relative inline-flex" title={label}>
      <span
        className="pointer-events-none select-none blur-[3px]"
        aria-hidden="true"
      >
        {children}
      </span>
      <Lock
        className="absolute inset-0 m-auto h-3 w-3 text-foreground/80 drop-shadow-sm"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
