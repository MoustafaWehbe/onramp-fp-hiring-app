import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { NotificationPage } from "../../types/notifications";
import * as api from "./api";

export const NOTIFICATIONS_PAGE_SIZE = 20;

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (status: "all" | "read" | "unread") =>
    ["notifications", "list", status] as const,
};

/**
 * Paginated rather than "load everything": a busy recruiter can accumulate
 * hundreds of rows, and the bell only ever shows the newest page until the
 * user asks for more.
 */
export function useNotifications(
  status: "all" | "read" | "unread" = "all",
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(status),
    queryFn: ({ pageParam }) =>
      api.getNotifications({
        limit: NOTIFICATIONS_PAGE_SIZE,
        offset: pageParam,
        status,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: NotificationPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    enabled,
    retry: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      api.markNotificationRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    },
  });
}

/** The server reports the authoritative unread count on every page. */
export function unreadCountFrom(
  pages: NotificationPage[] | undefined,
): number {
  return pages?.[0]?.unreadCount ?? 0;
}
