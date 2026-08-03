import { describe, expect, it } from "vitest";
import {
  BOARD_STAGES,
  DROPPABLE_STAGES,
  describeRefusedDrop,
  isDroppableStage,
} from "@/features/applications/components/pipeline-board";

describe("pipeline board stage rules", () => {
  it("gives every recruiter-visible stage a column", () => {
    // HIRED in particular: it exists in the API's stage enum and is what
    // time-to-hire measures against, so a hired candidate must have a column.
    expect(BOARD_STAGES).toEqual([
      "APPLIED",
      "REVIEWED",
      "INTERVIEWING",
      "OFFER",
      "HIRED",
      "REJECTED",
    ]);
  });

  it("accepts drops into exactly the stages the API allows as targets", () => {
    expect(DROPPABLE_STAGES).toEqual([
      "REVIEWED",
      "INTERVIEWING",
      "OFFER",
      "HIRED",
      "REJECTED",
    ]);
  });

  it("refuses a drop back into applied", () => {
    expect(isDroppableStage("APPLIED")).toBe(false);
    expect(describeRefusedDrop("APPLIED")).toBe(
      "A candidate can't be moved back to applied.",
    );
  });

  it("treats every other board stage as a valid target", () => {
    for (const stage of BOARD_STAGES.filter((stage) => stage !== "APPLIED")) {
      expect(isDroppableStage(stage)).toBe(true);
    }
  });

  it("imposes no ordering beyond the applied rule", () => {
    // The product has always allowed jumping stages; the board must not
    // invent a stricter rule than the endpoint it calls.
    expect(isDroppableStage("OFFER")).toBe(true);
    expect(isDroppableStage("HIRED")).toBe(true);
    expect(isDroppableStage("REJECTED")).toBe(true);
  });
});
