import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { applicationKeys } from "../features/applications/hooks";
import { notificationKeys } from "../features/notifications/hooks";
import {
  createRealtimeClient,
  type RealtimeClient,
  type RealtimeStatus,
} from "../features/realtime/client";
import { useAuth } from "../hooks/useAuth";
import { recruiterKeys } from "../features/recruiter/hooks";

interface RealtimeContextValue {
  status: RealtimeStatus;
  /** True once a connection has been established and then lost. */
  isDegraded: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "closed",
  isDegraded: false,
});

/**
 * Owns the single SSE connection for the signed-in session and translates
 * events into React Query invalidations. Deliberately no second state store:
 * the cache stays the one source of truth, and an event is just a smarter
 * trigger to refetch than a timer.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("closed");
  const hasConnected = useRef(false);

  useEffect(() => {
    if (!user || typeof EventSource === "undefined") {
      setStatus("closed");
      return;
    }

    let client: RealtimeClient | null = null;
    hasConnected.current = false;

    client = createRealtimeClient({
      onStatusChange: (next) => {
        setStatus(next);

        if (next === "open") {
          if (hasConnected.current) {
            // Anything that happened while the stream was down was never
            // pushed, so a reconnect refetches instead of leaving the UI on
            // stale data it has no way of knowing is stale.
            void queryClient.invalidateQueries({
              queryKey: notificationKeys.all,
            });
            void queryClient.invalidateQueries({
              queryKey: applicationKeys.all,
            });
          }
          hasConnected.current = true;
        }
      },
      onEvent: (event) => {
        if (event.name === "notification") {
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.all,
          });
          toast.info(event.payload.title);
          return;
        }

        // A pipeline row changed. Invalidating the job's list keeps the
        // server as the authority on ordering and on the fields the event
        // does not carry.
        void queryClient.invalidateQueries({
          queryKey: applicationKeys.byJob(event.payload.jobId),
        });
        void queryClient.invalidateQueries({
          queryKey: recruiterKeys.dashboard,
        });
        // The candidate detail view renders the same application's fit score
        // and interview fields, and no longer polls for them.
        void queryClient.invalidateQueries({
          queryKey: recruiterKeys.candidates,
        });
      },
    });

    return () => {
      client?.close();
    };
  }, [user, queryClient]);

  const value = useMemo(
    () => ({
      status,
      isDegraded: hasConnected.current && status !== "open",
    }),
    [status],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
