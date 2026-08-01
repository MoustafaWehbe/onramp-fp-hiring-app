import type { Job as QueueJob } from "bullmq";
import {
  computeCandidateRecommendations,
  type CandidateRecommendationsJobData,
  type CandidateRecommendationsJobResult,
} from "@starter-kit/shared";

/**
 * Scoring a profile against every open job is one model call per job, far too
 * slow for a page load, so it runs here and the read path serves the cache.
 *
 * Queued when a profile changes materially and on a periodic refresh. Two
 * queued refreshes for the same candidate are harmless: the compute replaces
 * that candidate's rows wholesale, so the later run simply wins.
 */
export async function processCandidateRecommendationsJob(
  queueJob: QueueJob<
    CandidateRecommendationsJobData,
    CandidateRecommendationsJobResult
  >,
): Promise<CandidateRecommendationsJobResult> {
  const { candidateProfileId, trigger } = queueJob.data;
  const result = await computeCandidateRecommendations(candidateProfileId);

  console.info(
    `[candidate-recommendations] profile ${candidateProfileId} (${trigger}): ` +
      `${result.status}, ${result.scored} job(s) scored`,
  );

  return result;
}
