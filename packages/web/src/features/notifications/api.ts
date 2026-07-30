import { apiClient } from "../../lib/api-client";
import type {
  ListNotificationsInput,
  NotificationPage,
  NotificationRecord,
} from "../../types/notifications";

interface Envelope<T> {
  data: T;
}

export async function getNotifications({
  limit,
  offset,
  status,
}: ListNotificationsInput = {}): Promise<NotificationPage> {
  const { data } = await apiClient.get<Envelope<NotificationPage>>(
    "/notifications",
    { params: { limit, offset, status } },
  );
  return data.data;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationRecord> {
  const { data } = await apiClient.patch<Envelope<NotificationRecord>>(
    `/notifications/${notificationId}/read`,
  );
  return data.data;
}

export async function markAllNotificationsRead(): Promise<{
  updated: number;
}> {
  const { data } = await apiClient.patch<Envelope<{ updated: number }>>(
    "/notifications/read-all",
  );
  return data.data;
}
