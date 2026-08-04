import { Worker } from "bullmq";
import {
  getQueuePrefix,
  getRedisConnection,
  QUEUE_NAMES,
} from "@starter-kit/shared";
import { processEmailJob } from "../jobs/email.job";
import { processEmbeddingsJob } from "../jobs/embeddings.job";
import { processApplicationFitScoreJob } from "../jobs/application-fit-score.job";
import { processCandidateRecommendationsJob } from "../jobs/candidate-recommendations.job";

export function createWorkers(): Worker[] {
  const connection = getRedisConnection();
  const prefix = getQueuePrefix();

  const emailWorker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection,
    prefix,
    concurrency: 10,
  });

  const embeddingsWorker = new Worker(
    QUEUE_NAMES.EMBEDDINGS,
    processEmbeddingsJob,
    {
      connection,
      prefix,
      concurrency: 5,
    },
  );

  const applicationFitScoreWorker = new Worker(
    QUEUE_NAMES.APPLICATION_FIT_SCORE,
    processApplicationFitScoreJob,
    {
      connection,
      prefix,
      concurrency: 3,
    },
  );

  // Low concurrency on purpose: one run fans out to a model call per open
  // job, so several candidates refreshing at once is the expensive case.
  const candidateRecommendationsWorker = new Worker(
    QUEUE_NAMES.CANDIDATE_RECOMMENDATIONS,
    processCandidateRecommendationsJob,
    {
      connection,
      prefix,
      concurrency: 2,
    },
  );

  const workers = [
    emailWorker,
    embeddingsWorker,
    applicationFitScoreWorker,
    candidateRecommendationsWorker,
  ];

  workers.forEach((worker) => {
    worker.on("completed", (job) => {
      console.info(`[${worker.name}] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error(`[${worker.name}] Worker error:`, err);
    });
  });

  return workers;
}
