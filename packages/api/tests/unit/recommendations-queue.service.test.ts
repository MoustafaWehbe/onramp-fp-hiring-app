const add = jest.fn();

jest.mock("../../src/lib/queue", () => ({
  candidateRecommendationsQueue: { add },
}));

import { enqueueCandidateRecommendations } from "../../src/services/recommendations-queue.service";

describe("candidate recommendation queue", () => {
  beforeEach(() => {
    add.mockReset();
    add.mockResolvedValue(undefined);
  });

  it("uses a BullMQ-safe deterministic id to debounce profile edits", async () => {
    const profileId = "11111111-1111-4111-8111-111111111111";

    await enqueueCandidateRecommendations(profileId, "profile-updated");

    expect(add).toHaveBeenCalledWith(
      "compute-candidate-recommendations",
      { candidateProfileId: profileId, trigger: "profile-updated" },
      {
        jobId: `recommendations-${profileId}`,
        delay: 5_000,
        removeOnComplete: true,
      },
    );
  });
});
