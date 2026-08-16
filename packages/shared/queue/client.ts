import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  QUEUE_NAMES,
  type ApplicationFitScoreJobData,
  type CandidateRecommendationsJobData,
  type EmailJobData,
  type EmbeddingsJobData,
} from "./types";

let redisConnection: IORedis | null = null;

/**
 * Unlimited retries with a capped linear backoff: this connection backs a
 * long-lived background process with nothing synchronously waiting on it, so
 * giving up after N attempts would just leave jobs stuck forever instead of
 * resuming once the network recovers. 200ms steps up to a 5s ceiling — quick
 * to recover from a one-off blip, without hammering Redis during a longer
 * outage.
 */
function retryStrategy(times: number): number {
  const delay = Math.min(times * 200, 5_000);
  console.warn(`[redis] connection lost, reconnecting (attempt ${times}, retrying in ${delay}ms)`);
  return delay;
}

/**
 * `reconnectOnError` is for Redis *protocol* errors returned as a command
 * reply (e.g. READONLY after a failover) — it does not fire for socket-level
 * resets like ECONNRESET, which `retryStrategy` above already handles via
 * ioredis's own reconnect loop. Kept narrow on purpose: reconnecting on every
 * error reply would mask real application bugs (a bad command, a wrong
 * argument) as if they were connection trouble.
 */
function reconnectOnError(err: Error): boolean {
  return /READONLY/i.test(err.message);
}

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      retryStrategy,
      reconnectOnError,
      // ioredis defaults keep-alive off entirely, so a genuinely idle socket
      // never gets an OS-level probe — exactly the shape of connection a
      // NAT/firewall/AV layer is most likely to silently drop, surfacing
      // here as an ECONNRESET on the next command. A 10s keep-alive is the
      // same fix already applied to the OpenRouter HTTPS client for the
      // identical symptom (see packages/shared/ai/client.ts).
      keepAlive: 10_000,
    });

    // BullMQ wraps this shared client once per Queue/Worker built on it, and
    // each wrapper re-emits the client's 'error' as its own 'error' event.
    // Node throws when an 'error' event has no listener, so this handler on
    // the raw client — and the one added per-Queue in createQueue() below —
    // are what actually stop a dropped connection from crashing the process;
    // retryStrategy above only governs *whether* it reconnects, not who
    // absorbs the event on the way there. One line, no stack trace, so a
    // string of resets during a flaky window stays readable.
    redisConnection.on("error", (error) => {
      console.warn(`[redis] connection error: ${error.message}`);
    });
  }
  return redisConnection;
}

function createQueue<T>(name: string): Queue<T> {
  const queue = new Queue<T>(name, {
    connection: getRedisConnection(),
    prefix: getQueuePrefix(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  // See the comment on the connection-level listener above: each Queue is
  // its own EventEmitter and needs its own 'error' listener, or an
  // unhandled connection error on the shared client crashes the process at
  // this Queue specifically (this is the exact crash BullMQ's Worker
  // instances in packages/workers/src/queues/index.ts already guard against
  // with their own "error" handler — Queue instances need the same).
  queue.on("error", (error) => {
    console.warn(`[redis] queue "${name}" connection error: ${error.message}`);
  });

  return queue;
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
export const candidateRecommendationsQueue =
  createQueue<CandidateRecommendationsJobData>(
    QUEUE_NAMES.CANDIDATE_RECOMMENDATIONS,
  );
