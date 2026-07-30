import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  QUEUE_NAMES,
  type ApplicationFitScoreJobData,
  type EmailJobData,
  type EmbeddingsJobData,
} from "./types";

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return redisConnection;
}

function createQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    prefix: getQueuePrefix(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
}

export function getQueuePrefix(): string {
  return (
    process.env.BULLMQ_PREFIX ??
    (process.env.NODE_ENV === "test" ? "starter-kit-test" : "bull")
  );
}

export const emailQueue = createQueue<EmailJobData>(QUEUE_NAMES.EMAIL);
export const embeddingsQueue = createQueue<EmbeddingsJobData>(
  QUEUE_NAMES.EMBEDDINGS,
);
export const applicationFitScoreQueue =
  createQueue<ApplicationFitScoreJobData>(
    QUEUE_NAMES.APPLICATION_FIT_SCORE,
  );
