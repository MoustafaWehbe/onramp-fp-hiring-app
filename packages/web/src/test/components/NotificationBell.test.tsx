import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/layout/NotificationBell";
import type { NotificationRecord } from "@/types/notifications";

const {
  navigate,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useRealtime,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  useMarkAllNotificationsRead: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useNotifications: vi.fn(),
  useRealtime: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("@/features/notifications/hooks", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/notifications/hooks")
  >("@/features/notifications/hooks");
  return {
    ...actual,
    useNotifications: (status: string) => useNotifications(status),
    useMarkNotificationRead: () => useMarkNotificationRead(),
    useMarkAllNotificationsRead: () => useMarkAllNotificationsRead(),
  };
});

vi.mock("@/providers/RealtimeProvider", () => ({
  useRealtime: () => useRealtime(),
}));

const newApplication: NotificationRecord = {
  id: "notification-1",
  type: "new_application",
  title: "Amara Okafor applied to Senior Product Engineer",
  body: "Open the pipeline to review this application.",
  relatedApplicationId: "application-1",
  relatedJobId: "job-1",
  readAt: null,
  createdAt: new Date().toISOString(),
};

const stageChange: NotificationRecord = {
  id: "notification-2",
  type: "stage_change",
  title: "Your application for Senior Product Engineer is now interviewing",
  body: "Moved from applied to interviewing.",
  relatedApplicationId: "application-2",
  relatedJobId: "job-1",
  readAt: "2026-07-31T09:00:00.000Z",
  createdAt: "2026-07-31T08:00:00.000Z",
};

function queryState(
  notifications: NotificationRecord[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return {
    data: {
      pages: [
        {
          notifications,
          total: notifications.length,
          unreadCount,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  };
}

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useNotifications.mockReturnValue(queryState([]));
  useMarkNotificationRead.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useMarkAllNotificationsRead.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  useRealtime.mockReturnValue({ status: "open", isDegraded: false });
});

describe("NotificationBell", () => {
  it("shows no badge when everything is read", () => {
    useNotifications.mockReturnValue(queryState([stageChange]));

    renderBell();

    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("badges the unread count from the server", () => {
    useNotifications.mockReturnValue(queryState([newApplication, stageChange]));

    renderBell();

    expect(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows an empty state rather than a blank panel", async () => {
    const user = userEvent.setup();

    renderBell();
    await user.click(screen.getByRole("button", { name: "Notifications" }));

    const panel = screen.getByRole("dialog", { name: "Notifications" });
    expect(
      within(panel).getByText("You're all caught up"),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /Mark all read/ }),
    ).not.toBeInTheDocument();
  });

  it("marks a notification read and navigates to its pipeline", async () => {
    const mutate = vi.fn();
    useNotifications.mockReturnValue(queryState([newApplication]));
    useMarkNotificationRead.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(screen.getByRole("button", { name: /Amara Okafor/ }));

    expect(mutate).toHaveBeenCalledWith("notification-1");
    expect(navigate).toHaveBeenCalledWith("/recruiter/pipeline/job-1");
  });

  it("sends a candidate to their applications on a stage change", async () => {
    useNotifications.mockReturnValue(
      queryState([{ ...stageChange, readAt: null }]),
    );
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(
      screen.getByRole("button", { name: /is now interviewing/ }),
    );

    expect(navigate).toHaveBeenCalledWith("/applications");
  });

  it("does not re-mark an already read notification", async () => {
    const mutate = vi.fn();
    useNotifications.mockReturnValue(queryState([stageChange]));
    useMarkNotificationRead.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();

    renderBell();
    await user.click(screen.getByRole("button", { name: "Notifications" }));
    await user.click(
      screen.getByRole("button", { name: /is now interviewing/ }),
    );

    expect(mutate).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/applications");
  });

  it("stays put when the related application is gone", async () => {
    useNotifications.mockReturnValue(
      queryState([
        {
          ...newApplication,
          relatedApplicationId: null,
          relatedJobId: null,
        },
      ]),
    );
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(screen.getByRole("button", { name: /Amara Okafor/ }));

    // Marked read, but no navigation to a job that no longer exists.
    expect(navigate).not.toHaveBeenCalled();
  });

  it("marks everything read from the panel", async () => {
    const mutate = vi.fn();
    useNotifications.mockReturnValue(queryState([newApplication]));
    useMarkAllNotificationsRead.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(screen.getByRole("button", { name: /Mark all read/ }));

    expect(mutate).toHaveBeenCalledOnce();
  });

  it("loads an older page instead of everything at once", async () => {
    const fetchNextPage = vi.fn();
    useNotifications.mockReturnValue(
      queryState([newApplication], { hasNextPage: true, fetchNextPage }),
    );
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );
    await user.click(screen.getByRole("button", { name: "Load older" }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("warns that the list may be behind while reconnecting", async () => {
    useRealtime.mockReturnValue({
      status: "reconnecting",
      isDegraded: true,
    });
    useNotifications.mockReturnValue(queryState([newApplication]));
    const user = userEvent.setup();

    renderBell();
    await user.click(
      screen.getByRole("button", { name: "Notifications, 1 unread" }),
    );

    expect(
      screen.getByText(/Reconnecting — this list may be behind/),
    ).toBeInTheDocument();
  });
});
