import type { NotificationRecord } from "../../types/notifications";
import type { RealtimeApplicationEvent } from "../../types/notifications";

export type RealtimeStatus = "connecting" | "open" | "reconnecting" | "closed";

export type RealtimeClientEvent =
  | { name: "notification"; payload: NotificationRecord }
  | { name: "application.changed"; payload: RealtimeApplicationEvent };

export interface RealtimeClientOptions {
  url?: string;
  onEvent: (event: RealtimeClientEvent) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
  /** Injectable for tests; defaults to the browser's EventSource. */
  createEventSource?: (url: string) => EventSource;
}

export interface RealtimeClient {
  close: () => void;
}

const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * EventSource retries by itself after a dropped connection, but it gives up
 * permanently when the server answers with an error status — which is exactly
 * what happens when the access-token cookie expires mid-session. Without the
 * manual retry below, a session would go quietly stale and never recover.
 */
export function createRealtimeClient({
  url = "/api/notifications/stream",
  onEvent,
  onStatusChange,
  createEventSource,
}: RealtimeClientOptions): RealtimeClient {
  const open =
    createEventSource ??
    ((target: string) =>
      new EventSource(target, { withCredentials: true }));

  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let closed = false;

  function setStatus(status: RealtimeStatus): void {
    onStatusChange?.(status);
  }

  function parse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  function scheduleReconnect(): void {
    if (closed || retryTimer) {
      return;
    }

    // Exponential backoff, capped, so a server that is down for minutes is
    // not hammered once per second by every open tab.
    const delay = Math.min(
      BASE_RECONNECT_MS * 2 ** attempt,
      MAX_RECONNECT_MS,
    );
    attempt += 1;
    setStatus("reconnecting");

    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  function connect(): void {
    if (closed) {
      return;
    }

    setStatus(attempt === 0 ? "connecting" : "reconnecting");
    source = open(url);

    source.onopen = () => {
      attempt = 0;
      setStatus("open");
    };

    source.addEventListener("notification", (event) => {
      const payload = parse<NotificationRecord>(
        (event as MessageEvent<string>).data,
      );
      if (payload) {
        onEvent({ name: "notification", payload });
      }
    });

    source.addEventListener("application.changed", (event) => {
      const payload = parse<RealtimeApplicationEvent>(
        (event as MessageEvent<string>).data,
      );
      if (payload) {
        onEvent({ name: "application.changed", payload });
      }
    });

    source.onerror = () => {
      // readyState CONNECTING means EventSource is handling the retry itself;
      // anything else means it has given up and we must reopen.
      if (source?.readyState === EventSource.CLOSED) {
        source.close();
        source = null;
        scheduleReconnect();
        return;
      }

      setStatus("reconnecting");
    };
  }

  connect();

  return {
    close: () => {
      closed = true;

      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      source?.close();
      source = null;
      setStatus("closed");
    },
  };
}
