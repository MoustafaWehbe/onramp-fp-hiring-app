import IORedis from "ioredis";
import { getRealtimeChannel, type RealtimeMessage } from "./types";

/**
 * Fan-out across processes. The API holds the open SSE connections, but the
 * events that matter are raised in two places: the API itself (a stage change)
 * and the workers process (a fit score completing). Redis pub/sub is the only
 * channel both already share, so it carries the events; a single-process
 * EventEmitter would silently drop everything the worker raises.
 *
 * Redis puts a subscribed connection into subscriber mode, where it can issue
 * nothing else — hence dedicated connections rather than the BullMQ one.
 */

let publisher: IORedis | null = null;
let subscriber: IORedis | null = null;

type RealtimeListener = (message: RealtimeMessage) => void;

const listeners = new Set<RealtimeListener>();

function redisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

function getPublisher(): IORedis {
  if (!publisher) {
    publisher = new IORedis(redisUrl(), { maxRetriesPerRequest: null });
    publisher.on("error", (error) => {
      console.error("[realtime] publisher connection error:", error.message);
    });
  }
  return publisher;
}

/**
 * Best-effort by design: a realtime push is a convenience layer over data that
 * is already committed, so a Redis outage must never fail the request that
 * triggered it. The client still sees the change on its next read.
 */
export async function publishRealtime(
  message: RealtimeMessage,
): Promise<void> {
  if (message.userIds.length === 0) {
    return;
  }

  try {
    await getPublisher().publish(
      getRealtimeChannel(),
      JSON.stringify(message),
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[realtime] Failed to publish event: ${detail}`);
  }
}

export function publishRealtimeAndForget(message: RealtimeMessage): void {
  void publishRealtime(message);
}

/**
 * Idempotent: the first caller opens the subscriber connection, every caller
 * adds a listener and gets back an unsubscribe function.
 */
export function subscribeRealtime(listener: RealtimeListener): () => void {
  listeners.add(listener);

  if (!subscriber) {
    subscriber = new IORedis(redisUrl(), { maxRetriesPerRequest: null });
    subscriber.on("error", (error) => {
      console.error("[realtime] subscriber connection error:", error.message);
    });
    // ioredis re-subscribes automatically after a reconnect, so a dropped
    // Redis connection recovers without the API process restarting.
    void subscriber.subscribe(getRealtimeChannel());
    subscriber.on("message", (_channel, raw) => {
      let message: RealtimeMessage;

      try {
        message = JSON.parse(raw) as RealtimeMessage;
      } catch {
        console.error("[realtime] Discarded an unparseable event payload");
        return;
      }

      for (const registered of listeners) {
        try {
          registered(message);
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : String(error);
          console.error(`[realtime] Listener failed: ${detail}`);
        }
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export async function closeRealtime(): Promise<void> {
  listeners.clear();
  await Promise.all([
    publisher?.quit().catch(() => undefined),
    subscriber?.quit().catch(() => undefined),
  ]);
  publisher = null;
  subscriber = null;
}
