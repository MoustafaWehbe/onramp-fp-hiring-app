import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";
import type { NotificationPage } from "@/types/notifications";

const { apiGet, apiPatch } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: { get: apiGet, patch: apiPatch },
}));

const page: NotificationPage = {
  notifications: [
    {
      id: "notification-1",
      type: "new_application",
      title: "Amara Okafor applied to Senior Product Engineer",
      body: "Open the pipeline to review this application.",
      relatedApplicationId: "application-1",
      relatedJobId: "job-1",
      readAt: null,
      createdAt: "2026-07-31T10:00:00.000Z",
    },
  ],
  total: 1,
  unreadCount: 1,
  limit: 20,
  offset: 0,
  hasMore: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifications API", () => {
  it("requests a bounded page and unwraps the envelope", async () => {
    apiGet.mockResolvedValue({ data: { data: page } });

    await expect(
      getNotifications({ limit: 20, offset: 40, status: "unread" }),
    ).resolves.toEqual(page);
    expect(apiGet).toHaveBeenCalledWith("/notifications", {
      params: { limit: 20, offset: 40, status: "unread" },
    });
  });

  it("marks a single notification read", async () => {
    apiPatch.mockResolvedValue({
      data: { data: { ...page.notifications[0], readAt: "2026-07-31T11:00:00.000Z" } },
    });

    const result = await markNotificationRead("notification-1");

    expect(apiPatch).toHaveBeenCalledWith(
      "/notifications/notification-1/read",
    );
    expect(result.readAt).toBe("2026-07-31T11:00:00.000Z");
  });

  it("marks every notification read", async () => {
    apiPatch.mockResolvedValue({ data: { data: { updated: 3 } } });

    await expect(markAllNotificationsRead()).resolves.toEqual({ updated: 3 });
    expect(apiPatch).toHaveBeenCalledWith("/notifications/read-all");
  });
});
