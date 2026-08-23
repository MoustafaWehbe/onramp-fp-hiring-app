import type { RecruiterApplicationStage } from "../../../types/applications";

/**
 * The board's stage palette.
 *
 * This is an extension of the app's token system in `features/candidate/theme.ts`,
 * not a rival to it: the base card surface, hover-lift and indigo/violet accent
 * all still come from there, and every hue below is a Tailwind ramp already in
 * use elsewhere in the app (slate in `Badge`'s `muted`, emerald in its
 * `success`, violet in `ACCENT_GRADIENT`). It lives beside the board rather
 * than inside `theme.ts` because a stage colour means nothing outside this
 * screen, and beside `pipeline-board.ts` rather than inside it because that
 * file holds the board's *rules* — which columns exist and which accept a drop
 * — and those must stay readable without wading through class strings.
 *
 * Every entry carries an explicit `dark:` variant. The dark values are
 * re-picked against the dark surface rather than mechanically inverted, the
 * same approach the chart ramp in globals.css takes: tinted panels drop to a
 * low-alpha wash so six columns side by side don't turn the page into a
 * rainbow, while the solid accents brighten a step to hold contrast.
 */
export interface StageTheme {
  /** Solid accent — the header's top bar and its dot. */
  accent: string;
  /** The column panel itself: the tinted surface cards visibly sit inside. */
  surface: string;
  /** Panel border, one step stronger than the surface. */
  border: string;
  /** Header label ink, tinted toward the stage hue. */
  headerText: string;
  /** The count pill in the header. */
  countBadge: string;
  /** The card's left accent bar, tying a card to the column it sits in. */
  cardAccent: string;
  /** The panel while a valid dragged card hovers over it. */
  dropActive: string;
}

export const STAGE_THEME: Record<RecruiterApplicationStage, StageTheme> = {
  APPLIED: {
    accent: "bg-slate-400 dark:bg-slate-500",
    surface: "bg-slate-100/70 dark:bg-slate-900/40",
    border: "border-slate-200/80 dark:border-slate-800",
    headerText: "text-slate-700 dark:text-slate-300",
    countBadge: "bg-slate-200/90 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    cardAccent: "bg-slate-300 dark:bg-slate-600",
    // APPLIED never accepts a drop, so this is only ever the "not here"
    // treatment — see REFUSED_DROP_CLASS below.
    dropActive: "",
  },
  REVIEWED: {
    accent: "bg-blue-500 dark:bg-blue-400",
    surface: "bg-blue-50/70 dark:bg-blue-950/30",
    border: "border-blue-200/70 dark:border-blue-900/60",
    headerText: "text-blue-800 dark:text-blue-200",
    countBadge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200",
    cardAccent: "bg-blue-400 dark:bg-blue-500",
    dropActive:
      "border-blue-400 bg-blue-100/80 ring-2 ring-blue-300/70 dark:border-blue-500 dark:bg-blue-900/40 dark:ring-blue-500/40",
  },
  INTERVIEWING: {
    accent: "bg-violet-500 dark:bg-violet-400",
    surface: "bg-violet-50/70 dark:bg-violet-950/30",
    border: "border-violet-200/70 dark:border-violet-900/60",
    headerText: "text-violet-800 dark:text-violet-200",
    countBadge:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
    cardAccent: "bg-violet-400 dark:bg-violet-500",
    dropActive:
      "border-violet-400 bg-violet-100/80 ring-2 ring-violet-300/70 dark:border-violet-500 dark:bg-violet-900/40 dark:ring-violet-500/40",
  },
  OFFER: {
    accent: "bg-emerald-500 dark:bg-emerald-400",
    surface: "bg-emerald-50/70 dark:bg-emerald-950/30",
    border: "border-emerald-200/70 dark:border-emerald-900/60",
    headerText: "text-emerald-800 dark:text-emerald-200",
    countBadge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    cardAccent: "bg-emerald-400 dark:bg-emerald-500",
    dropActive:
      "border-emerald-400 bg-emerald-100/80 ring-2 ring-emerald-300/70 dark:border-emerald-500 dark:bg-emerald-900/40 dark:ring-emerald-500/40",
  },
  HIRED: {
    // Deeper than OFFER on purpose: the two are adjacent columns on the same
    // hue, and the outcome column should read as the heavier of the pair.
    accent: "bg-emerald-700 dark:bg-emerald-500",
    surface: "bg-emerald-100/70 dark:bg-emerald-950/60",
    border: "border-emerald-300/70 dark:border-emerald-800/70",
    headerText: "text-emerald-900 dark:text-emerald-100",
    countBadge:
      "bg-emerald-200/90 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-100",
    cardAccent: "bg-emerald-600 dark:bg-emerald-500",
    dropActive:
      "border-emerald-500 bg-emerald-200/70 ring-2 ring-emerald-400/70 dark:border-emerald-400 dark:bg-emerald-900/60 dark:ring-emerald-400/40",
  },
  REJECTED: {
    // Muted rather than alarming: rejection is a normal pipeline outcome, and
    // a full-strength red column would shout louder than HIRED. The dark
    // values sit two steps deeper than the light ones rather than one — red is
    // the hue that gains the most apparent intensity against a near-black
    // page, and at rose-600 this column pulled the eye straight past HIRED.
    accent: "bg-rose-400 dark:bg-rose-800",
    surface: "bg-rose-50/60 dark:bg-rose-950/25",
    border: "border-rose-200/70 dark:border-rose-900/50",
    headerText: "text-rose-800 dark:text-rose-300",
    countBadge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    cardAccent: "bg-rose-300 dark:bg-rose-900",
    dropActive:
      "border-rose-400 bg-rose-100/80 ring-2 ring-rose-300/70 dark:border-rose-600 dark:bg-rose-900/40 dark:ring-rose-700/50",
  },
};

/**
 * How a column that cannot accept the dragged card is drawn while a drag is
 * in flight. Dimmed and desaturated, with a not-allowed cursor over the whole
 * panel, so the refusal is visible *before* the drop rather than only as a
 * toast afterwards.
 */
export const REFUSED_DROP_CLASS =
  "cursor-not-allowed opacity-50 saturate-50";

/** Fit-score bands. Exported so the card and its tests agree on the edges. */
export type FitScoreTier = "strong" | "solid" | "fair" | "weak";

/**
 * A score's band. The thresholds match the ones `PipelineCard` already used
 * for its badge variant (75 / 50), with an extra step at 88 so that the
 * genuinely standout candidates in an 80-card APPLIED column separate from the
 * merely good ones — with this many cards on screen, three bands isn't enough
 * granularity to scan by.
 */
export function fitScoreTier(score: number): FitScoreTier {
  if (score >= 88) return "strong";
  if (score >= 75) return "solid";
  if (score >= 50) return "fair";
  return "weak";
}

/**
 * Weighting by value, not just colour: `strong` is a filled chip and `weak` is
 * a barely-there outline, so the eye lands on the best candidates in a column
 * before it reads a single digit.
 */
export const FIT_SCORE_TIER_CLASS: Record<FitScoreTier, string> = {
  strong:
    "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 dark:bg-emerald-500 dark:text-emerald-950 dark:shadow-emerald-500/25",
  solid:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  fair: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  weak: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
};

/** Width of an expanded column, and of the drag overlay that mimics one. */
export const COLUMN_WIDTH_CLASS = "w-[19rem]";

/**
 * Bounds the card list so each column scrolls on its own instead of the whole
 * board growing to the height of the tallest one. Viewport-relative because
 * the recruiter shell already caps itself to `h-screen`, so there is a real
 * viewport to measure against.
 *
 * The 27rem is the page chrome above the board — top bar, page heading, filter
 * card — measured in the browser rather than guessed, and it is deliberately
 * an approximation: it is tuned so the columns end just inside the fold in the
 * ordinary case, and when a banner does push the board down (a degraded
 * realtime warning, the post-drop schedule prompt) the page simply scrolls a
 * little, which is a far better failure than columns that are permanently
 * short by the height of a banner that usually isn't there.
 */
export const COLUMN_LIST_HEIGHT_CLASS =
  "max-h-[calc(100vh-27rem)] min-h-[7rem]";
