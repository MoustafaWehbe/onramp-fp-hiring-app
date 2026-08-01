import type { Transaction } from "sequelize";
import { ApplicationStageHistory } from "./models/ApplicationStageHistory";
import type { ApplicationStage } from "./models/Application";

/**
 * The only writer of application_stage_history.
 *
 * It sits next to stage-transitions.ts on purpose: that module says which
 * moves are allowed, this one records the ones that happened, and every
 * caller that performs a transition goes through both. Recording from the
 * places that mutate — rather than from each controller — is what keeps the
 * button, the Kanban drop, and anything added later producing exactly one row
 * per move.
 *
 * Rows are append-only and carry their own changedAt so a caller inside a
 * transaction records the moment of the change, not the moment of commit.
 */
export async function recordStageChange(input: {
  applicationId: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  /** The recruiter who made the move; null for candidate or system events. */
  changedBy?: string | null;
  changedAt?: Date;
  transaction?: Transaction;
}): Promise<void> {
  // A no-op move would add a row saying nothing changed.
  if (input.fromStage === input.toStage) {
    return;
  }

  await ApplicationStageHistory.create(
    {
      applicationId: input.applicationId,
      fromStage: input.fromStage,
      toStage: input.toStage,
      changedBy: input.changedBy ?? null,
      changedAt: input.changedAt ?? new Date(),
    },
    input.transaction ? { transaction: input.transaction } : undefined,
  );
}

/** The submission entry: a candidate applying, with no preceding stage. */
export async function recordApplicationSubmitted(input: {
  applicationId: string;
  submittedAt?: Date;
  transaction?: Transaction;
}): Promise<void> {
  await recordStageChange({
    applicationId: input.applicationId,
    fromStage: null,
    toStage: "APPLIED",
    changedBy: null,
    changedAt: input.submittedAt ?? new Date(),
    transaction: input.transaction,
  });
}
