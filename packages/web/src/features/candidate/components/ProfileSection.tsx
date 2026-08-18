import { Pencil, Plus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import {
  CARD_CLASS,
  SECTION_HEADING_CLASS,
  TEXT_HEADING,
  TEXT_META,
  ACCENT_HOVER,
} from "../theme";
/**
 * Anchor id for a section, derived from its title so it stays stable without
 * every card having to invent and pass one.
 */
export function profileSectionId(title: string): string {
  return `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * The one section-card shell every profile card uses.
 *
 * Typography lives here rather than in each card so the scale is applied once:
 * section titles are text-lg, body is text-sm, and muted text is stone-600.
 * Before this, each card picked its own sizes and they drifted.
 */
export function ProfileSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // The id is the quick-links scroll target; data-profile-section is how the
    // drawer discovers which sections are actually on the page, so it never
    // offers a link to a card that didn't render. scroll-mt clears the sticky
    // h-16 header that would otherwise sit over the heading after a jump.
    <Card
      id={profileSectionId(title)}
      data-profile-section={title}
      className={cn(CARD_CLASS, "scroll-mt-20", className)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
  className={cn(
    "flex items-center gap-2",
    SECTION_HEADING_CLASS,
    TEXT_HEADING,
  )}
>
              {Icon && (
                <Icon
                  className="h-5 w-5 shrink-0 text-indigo-600"
                  aria-hidden="true"
                />
              )}
              {title}
            </h2>
            {description && (
              <p className={cn( "mt-1 text-sm",TEXT_META,)}>{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
    </Card>
  );
}

/**
 * The corner affordance. An icon-only control by design — it sits beside a
 * heading that already says what is being edited, so a visible label would
 * just repeat it. The accessible name carries that context instead.
 */
export function SectionAction({
  label,
  onClick,
  variant = "edit",
}: {
  label: string;
  onClick: () => void;
  variant?: "edit" | "add";
}) {
  const Icon = variant === "add" ? Plus : Pencil;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
     className={cn(
  "h-9 w-9 rounded-full transition-colors",
  TEXT_META,
  ACCENT_HOVER,
)}

    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Circular avatar with an initials fallback. No upload flow — the brief
 * scopes that out, so a set photo_url renders and anything else falls back.
 */
export function ProfileAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
