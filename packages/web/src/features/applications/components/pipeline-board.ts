import type {
  RecruiterApplicationStage,
  RecruiterMutableApplicationStage,
} from "../../../types/applications";

/**
 * Board columns, left to right. Every stage a recruiter can see an
 * application in gets a column — including HIRED, which the API's stage enum
 * defines and which time-to-hire measures against. Leaving it out would strand
 * hired candidates with nowhere to appear.
 */
export const BOARD_STAGES: RecruiterApplicationStage[] = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
];

/**
 * Columns a card can be dropped into.
 *
 * Typed as the mutable-stage union so this list cannot silently disagree with
 * what the API accepts: `RecruiterMutableApplicationStage` is the same
 * exclusion the server derives its request schema from, and adding a stage to
 * the union makes this array fail to typecheck until it is handled.
 *
 * APPLIED is absent deliberately and is the one rule the board enforces
 * visually — a candidate applies, a recruiter cannot un-apply them. The
 * server re-checks it regardless; this only avoids offering a drop that would
 * be rejected.
 */
export const DROPPABLE_STAGES: RecruiterMutableApplicationStage[] = [
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
];

export function isDroppableStage(
  stage: string,
): stage is RecruiterMutableApplicationStage {
  return (DROPPABLE_STAGES as string[]).includes(stage);
}

export const stageLabels: Record<RecruiterApplicationStage, string> = {
  APPLIED: "Applied",
  REVIEWED: "Reviewed",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

/** Why a drop was refused, phrased for a toast rather than a log line. */
export function describeRefusedDrop(stage: RecruiterApplicationStage): string {
  if (stage === "APPLIED") {
    return "A candidate can't be moved back to applied.";
  }

  return `Candidates can't be moved to ${stageLabels[stage].toLowerCase()}.`;
}
