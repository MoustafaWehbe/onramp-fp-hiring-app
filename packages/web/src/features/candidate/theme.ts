import { SKILL_PILL_CLASS } from "../../components/skills/styles";

/** Shared visual language for the four candidate-profile cards: warm neutral base, indigo-violet accent, rounded-2xl, soft shadows. */
export const CARD_CLASS =
  "rounded-2xl border-stone-200/70 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-[0_6px_24px_-4px_rgba(79,70,229,0.10)] dark:shadow-[0_6px_24px_-4px_rgba(129,140,248,0.15)]";
/**
 * Hover-lift affordance for interactive cards (job cards, pipeline cards,
 * recommendation cards). Pair with CARD_CLASS via cn(CARD_CLASS, CARD_HOVER_CLASS).
 * The motion itself is neutralized app-wide for prefers-reduced-motion in globals.css,
 * so this token doesn't need its own reduced-motion branch.
 */
export const CARD_HOVER_CLASS =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-6px_rgba(79,70,229,0.18)] dark:hover:shadow-[0_10px_30px_-6px_rgba(129,140,248,0.22)]";

/** Shared page measure and vertical rhythm used by app workspace content. */
export const APP_CONTENT_CLASS =
  "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
export const PAGE_SECTION_SPACING = "space-y-6";

export const ACCENT_GRADIENT =
  "bg-gradient-to-br from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400";
export const ACCENT_TEXT = "text-indigo-600 dark:text-indigo-400";
export const ACCENT_RING = "focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-300";
 
/**
 * Typography scale, centralized so no card invents its own sizes or shades.
 * Section titles are text-lg, body/subtitle is text-sm, meta is text-xs.
 * Pulled from actual usage in ProfileSection/Timeline rather than invented fresh.
 */
export const TEXT_HEADING = "text-stone-900 dark:text-stone-100";
export const TEXT_BODY = "text-stone-600 dark:text-stone-400";
export const TEXT_META = "text-stone-500 dark:text-stone-400";
export const TEXT_SUBTLE = "text-stone-400 dark:text-stone-500";
export const IDENTITY_HEADING_CLASS =
  "text-2xl font-bold tracking-tight sm:text-3xl";
export const SECTION_HEADING_CLASS = "text-lg font-semibold";
 
/** Borders/dividers that sit on top of CARD_CLASS's background. */
export const BORDER_SUBTLE = "border-stone-200 dark:border-stone-800";
 
/** Hover affordance for icon-only corner actions (edit/add). */
export const ACCENT_HOVER =
  "hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400";
 
/** The connecting line in Timeline — decorative rail between markers. */
export const TIMELINE_RAIL = "bg-stone-200 dark:bg-stone-800";
 
/** Soft ring behind the Timeline "current" marker. */
export const ACCENT_RING_SOFT = "ring-indigo-100 dark:ring-indigo-500/20";
 
/** Warning/caution status text (e.g. a CV that uploaded but couldn't be parsed). */
export const TEXT_WARNING = "text-amber-700 dark:text-amber-400";
 /** Indigo pill/chip style for tags — e.g. a skill badge. */
export const ACCENT_CHIP =
  SKILL_PILL_CLASS;
/** Full warning-banner container (border + background) — pair with TEXT_WARNING for the text inside. */
export const WARNING_BANNER =
  "border-amber-500/40 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40";
/** Soft indigo-tinted panel background — for a highlighted block inside a card, not a pill/tag. */
export const ACCENT_SURFACE =
  "border border-indigo-100 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/30";
