import { Bell, CheckCheck, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  unreadCountFrom,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../../features/notifications/hooks";
import { useRealtime } from "../../providers/RealtimeProvider";
import { cn } from "../../lib/utils";
import type { NotificationRecord } from "../../types/notifications";

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

/**
 * A notification links to wherever its subject is reviewed: recruiters land
 * on the job's pipeline, candidates on their applications list. A notification
 * whose application has since been removed has no job id and stays inert
 * rather than navigating somewhere broken.
 */
function destinationFor(notification: NotificationRecord): string | null {
  if (notification.type === "new_application") {
    return notification.relatedJobId
      ? `/recruiter/pipeline/${notification.relatedJobId}`
      : null;
  }

  return notification.relatedApplicationId ? "/applications" : null;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { isDegraded } = useRealtime();
  const notificationsQuery = useNotifications("all");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const pages = notificationsQuery.data?.pages;
  const notifications = pages?.flatMap((page) => page.notifications) ?? [];
  const unreadCount = unreadCountFrom(pages);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function openNotification(notification: NotificationRecord): void {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }

    const destination = destinationFor(notification);
    setIsOpen(false);

    if (destination) {
      navigate(destination);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-background shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {markAllRead.isPending ? "Marking…" : "Mark all read"}
              </Button>
            )}
          </div>

          {isDegraded && (
            <p className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Reconnecting — this list may be behind.
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Loading notifications…
              </p>
            ) : notificationsQuery.isError ? (
              <p className="px-4 py-6 text-sm text-muted-foreground" role="alert">
                Couldn&apos;t load notifications.
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New applications and stage changes will show up here.
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-accent",
                        !notification.readAt && "bg-primary/5",
                      )}
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm",
                            notification.readAt
                              ? "text-muted-foreground"
                              : "font-semibold",
                          )}
                        >
                          {notification.title}
                        </span>
                        {!notification.readAt && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        )}
                      </span>
                      {notification.body && (
                        <span className="text-xs text-muted-foreground">
                          {notification.body}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {relativeTime(notification.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notificationsQuery.hasNextPage && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void notificationsQuery.fetchNextPage()}
                disabled={notificationsQuery.isFetchingNextPage}
              >
                {notificationsQuery.isFetchingNextPage
                  ? "Loading…"
                  : "Load older"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
