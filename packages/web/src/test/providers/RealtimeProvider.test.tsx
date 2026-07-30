import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import type { RealtimeClientEvent } from "@/features/realtime/client";

const { createRealtimeClient, toastInfo, useAuth } = vi.hoisted(() => ({
  createRealtimeClient: vi.fn(),
  toastInfo: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/features/realtime/client", () => ({ createRealtimeClient }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuth() }));
vi.mock("sonner", () => ({ toast: { info: toastInfo } }));

interface Harness {
  emit: (event: RealtimeClientEvent) => void;
  setStatus: (status: string) => void;
  close: ReturnType<typeof vi.fn>;
}

function setup(): { harness: Harness; queryClient: QueryClient } {
  const close = vi.fn();
  const harness: Harness = {
    emit: () => undefined,
    setStatus: () => undefined,
    close,
  };

  createRealtimeClient.mockImplementation(
    ({
      onEvent,
      onStatusChange,
    }: {
      onEvent: (event: RealtimeClientEvent) => void;
      onStatusChange: (status: string) => void;
    }) => {
      harness.emit = onEvent;
      harness.setStatus = onStatusChange;
      return { close };
    },
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return { harness, queryClient };
}

function renderProvider(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <p>app</p>
      </RealtimeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: "user-1", name: "Rae Cruter" } });
  vi.stubGlobal("EventSource", class {});
});

describe("RealtimeProvider", () => {
  it("opens no stream for a signed-out visitor", () => {
    useAuth.mockReturnValue({ user: null });
    const { queryClient } = setup();

    renderProvider(queryClient);

    expect(createRealtimeClient).not.toHaveBeenCalled();
  });

  it("opens one stream for the signed-in user and closes it on unmount", () => {
    const { harness, queryClient } = setup();

    const view = renderProvider(queryClient);
    expect(createRealtimeClient).toHaveBeenCalledOnce();

    view.unmount();
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("invalidates the job's pipeline when an application changes", async () => {
    const { harness, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderProvider(queryClient);
    harness.emit({
      name: "application.changed",
      payload: {
        applicationId: "application-1",
        jobId: "job-1",
        stage: "INTERVIEWING",
        aiScoringStatus: "completed",
        fitScore: 87,
        interviewDate: null,
      },
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["applications", "job", "job-1"],
      });
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["recruiter", "dashboard"],
    });
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("refreshes the notification list and toasts on a new notification", async () => {
    const { harness, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderProvider(queryClient);
    harness.emit({
      name: "notification",
      payload: {
        id: "notification-1",
        type: "new_application",
        title: "Amara Okafor applied to Senior Product Engineer",
        body: null,
        relatedApplicationId: "application-1",
        relatedJobId: "job-1",
        readAt: null,
        createdAt: "2026-07-31T10:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    });
    expect(toastInfo).toHaveBeenCalledWith(
      "Amara Okafor applied to Senior Product Engineer",
    );
  });

  it("catches up on reconnect but not on the first connect", async () => {
    const { harness, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderProvider(queryClient);

    // First open: the queries are being fetched normally already.
    act(() => harness.setStatus("open"));
    expect(invalidate).not.toHaveBeenCalled();

    // Dropped, then back — anything that happened meanwhile was never
    // pushed, so the cache must be refetched rather than trusted.
    act(() => harness.setStatus("reconnecting"));
    act(() => harness.setStatus("open"));

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["applications"],
    });
  });
});
