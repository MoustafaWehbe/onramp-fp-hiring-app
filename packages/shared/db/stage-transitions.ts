import { APPLICATION_STAGES, type ApplicationStage } from "./models/Application";

/**
 * The single definition of which stage moves a recruiter may perform.
 *
 * It exists because the same rule now has three consumers: the request
 * schema that rejects a bad body, the service that guards a direct call, and
 * the Kanban board that decides which columns accept a dropped card. Before
 * the board, the rule lived only in a zod enum — fine for one caller, but a
 * drag target computed separately would have been free to drift looser than
 * the endpoint it calls.
 */

/** Stages a recruiter may move an application *to*. */
export const RECRUITER_TARGET_STAGES = [
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const satisfies readonly ApplicationStage[];

export type RecruiterTargetStage = (typeof RECRUITER_TARGET_STAGES)[number];

/**
 * Stages a recruiter can see an application *in*, in board order. APPLIED is
 * present because applications arrive there and must be visible, even though
 * nothing can be moved back into it.
 */
export const RECRUITER_BOARD_STAGES = [
  "APPLIED",
  ...RECRUITER_TARGET_STAGES,
] as const satisfies readonly ApplicationStage[];

export type RecruiterBoardStage = (typeof RECRUITER_BOARD_STAGES)[number];

/**
 * The stage an application is considered hired at. Checked against the real
 * enum rather than assumed: HIRED exists, so OFFER is not a terminal state.
 */
export const HIRED_STAGE = "HIRED" as const satisfies ApplicationStage;

/**
 * Forward progression used for funnel maths. REJECTED is deliberately absent:
 * it is an exit that can be taken from any stage, not a step in the sequence.
 */
export const FUNNEL_STAGE_ORDER = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
] as const satisfies readonly ApplicationStage[];

export type FunnelStage = (typeof FUNNEL_STAGE_ORDER)[number];

export function isRecruiterTargetStage(
  stage: string,
): stage is RecruiterTargetStage {
  return (RECRUITER_TARGET_STAGES as readonly string[]).includes(stage);
}

export function isRecruiterBoardStage(
  stage: string,
): stage is RecruiterBoardStage {
  return (RECRUITER_BOARD_STAGES as readonly string[]).includes(stage);
}

/**
 * Whether a recruiter may move an application from one stage to another.
 *
 * Note what this deliberately does *not* do: there is no required order.
 * The product has always let a recruiter jump straight from APPLIED to OFFER,
 * or send someone back from INTERVIEWING to REVIEWED, and the board does not
 * tighten that. The real constraints are that a DRAFT is candidate-private
 * until submitted, and that nothing can be moved back into APPLIED — a
 * candidate applies, a recruiter cannot un-apply them.
 */
export function canRecruiterMoveStage(
  from: ApplicationStage,
  to: string,
): to is RecruiterTargetStage {
  if (from === "DRAFT") {
    return false;
  }

  return isRecruiterTargetStage(to);
}

/** Human-readable reason a move was refused, for the error surfaced on drop. */
export function describeInvalidStageMove(
  from: ApplicationStage,
  to: string,
): string {
  if (from === "DRAFT") {
    return "This application is still a draft and is not in your pipeline yet.";
  }

  if (to === "APPLIED") {
    return "A candidate can't be moved back to applied.";
  }

  if (!(APPLICATION_STAGES as readonly string[]).includes(to)) {
    return `${to} is not a valid stage.`;
  }

  return `A candidate can't be moved to ${to.toLowerCase()}.`;
}
