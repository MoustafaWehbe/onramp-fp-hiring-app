import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRealtimeClient,
  type RealtimeClientEvent,
  type RealtimeStatus,
} from "@/features/realtime/client";

/** Minimal stand-in for the browser EventSource, driven by the test. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  closed = false;

  private listeners = new Map<string, Array<(event: MessageEvent) => void>>();

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, handler: (event: MessageEvent) => void): void {
    const existing = this.listeners.get(name) ?? [];
    existing.push(handler);
    this.listeners.set(name, existing);
  }

  emit(name: string, data: unknown): void {
    for (const handler of this.listeners.get(name) ?? []) {
      handler({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  emitRaw(name: string, data: string): void {
    for (const handler of this.listeners.get(name) ?? []) {
      handler({ data } as MessageEvent);
    }
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  /** The browser gives up permanently; readyState goes to CLOSED (2). */
  failPermanently(): void {
    this.readyState = 2;
    this.onerror?.();
  }

  /** A transient drop the browser retries on its own; stays CONNECTING (0). */
  dropTransiently(): void {
    this.readyState = 0;
    this.onerror?.();
  }

  close(): void {
    this.closed = true;
  }
}

const notification = {
  id: "notification-1",
  type: "new_application" as const,
  title: "Amara Okafor applied to Senior Product Engineer",
  body: "Open the pipeline to review this application.",
  relatedApplicationId: "application-1",
  relatedJobId: "job-1",
  readAt: null,
  createdAt: "2026-07-31T10:00:00.000Z",
};

beforeEach(() => {
  vi.useRealTimers();
  FakeEventSource.instances = [];
  // The client compares against EventSource.CLOSED.
  vi.stubGlobal("EventSource", { CLOSED: 2, CONNECTING: 0, OPEN: 1 });
});

function connect(overrides: Partial<{ onEvent: (e: RealtimeClientEvent) => void }> = {}) {
  const events: RealtimeClientEvent[] = [];
  const statuses: RealtimeStatus[] = [];
  const client = createRealtimeClient({
    onEvent: overrides.onEvent ?? ((event) => events.push(event)),
    onStatusChange: (status) => statuses.push(status),
    createEventSource: (url) =>
      new FakeEventSource(url) as unknown as EventSource,
  });

  return { client, events, statuses };
}

describe("realtime client", () => {
  it("connects to the stream endpoint and reports an open status", () => {
    const { statuses } = connect();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe(
      "/api/notifications/stream",
    );
    expect(statuses).toEqual(["connecting"]);

    FakeEventSource.instances[0].open();
    expect(statuses).toEqual(["connecting", "open"]);
  });

  it("parses both event types", () => {
    const { events } = connect();
    const source = FakeEventSource.instances[0];

    source.emit("notification", notification);
    source.emit("application.changed", {
      applicationId: "application-1",
      jobId: "job-1",
      stage: "INTERVIEWING",
      aiScoringStatus: "completed",
      fitScore: 87,
      interviewDate: null,
    });

    expect(events).toEqual([
      { name: "notification", payload: notification },
      {
        name: "application.changed",
        payload: {
          applicationId: "application-1",
          jobId: "job-1",
          stage: "INTERVIEWING",
          aiScoringStatus: "completed",
          fitScore: 87,
          interviewDate: null,
        },
      },
    ]);
  });

  it("ignores a malformed payload instead of throwing", () => {
    const { events } = connect();

    FakeEventSource.instances[0].emitRaw("notification", "not json{");

    expect(events).toHaveLength(0);
  });

  it("reopens the stream itself when the browser gives up", async () => {
    vi.useFakeTimers();
    const { statuses } = connect();
    const first = FakeEventSource.instances[0];

    first.open();
    first.failPermanently();

    expect(first.closed).toBe(true);
    expect(statuses).toContain("reconnecting");
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_000);

    // A second EventSource means the session recovers rather than going
    // silently stale.
    expect(FakeEventSource.instances).toHaveLength(2);
    FakeEventSource.instances[1].open();
    expect(statuses.at(-1)).toBe("open");
    vi.useRealTimers();
  });

  it("leaves a transient drop to the browser's own retry", () => {
    const { statuses } = connect();
    const source = FakeEventSource.instances[0];

    source.open();
    source.dropTransiently();

    expect(source.closed).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(statuses.at(-1)).toBe("reconnecting");
  });

  it("backs off exponentially across repeated failures", async () => {
    vi.useFakeTimers();
    connect();

    FakeEventSource.instances[0].failPermanently();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.instances[1].failPermanently();
    await vi.advanceTimersByTimeAsync(1_000);
    // Still waiting: the second delay is 2s, not another 1s.
    expect(FakeEventSource.instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(FakeEventSource.instances).toHaveLength(3);
    vi.useRealTimers();
  });

  it("stops reconnecting once closed", async () => {
    vi.useFakeTimers();
    const { client, statuses } = connect();

    FakeEventSource.instances[0].failPermanently();
    client.close();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(statuses.at(-1)).toBe("closed");
    vi.useRealTimers();
  });
});
