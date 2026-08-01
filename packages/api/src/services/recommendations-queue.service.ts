import type { CandidateRecommendationsJobData } from "@starter-kit/shared/queue";

/**
 * Mirrors application-scoring-queue.service: queuing is best-effort and never
 * blocks the request that triggered it. A missed refresh means the candidate
 * sees slightly stale recommendations, not a failed profile save.
 */
export async function enqueueCandidateRecommendations(
  candidateProfileId: string,
  trigger: CandidateRecommendationsJobData["trigger"],
): Promise<void> {
  const { candidateRecommendationsQueue } = await import("../lib/queue");

  await candidateRecommendationsQueue.add(
    "compute-candidate-recommendations",
    { candidateProfileId, trigger },
    {
      // Collapses a burst of edits into one refresh: saving three fields in a
      // row should not queue three full rescoring passes.
      jobId: `recommendations:${candidateProfileId}`,
      delay: 5_000,
      removeOnComplete: true,
    },
  );
}

export function scheduleCandidateRecommendations(
  candidateProfileId: string,
  trigger: CandidateRecommendationsJobData["trigger"],
): void {
  void enqueueCandidateRecommendations(candidateProfileId, trigger).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[candidate-recommendations] Failed to queue profile ${candidateProfileId}: ${message}`,
      );
    },
  );
}
