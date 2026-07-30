import { z } from "zod";

export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_MAX_PAGE_SIZE = 50;

export const notificationIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// A user with hundreds of unread notifications must never load them all, so
// the list is paginated with a bounded page size rather than an open limit.
export const listNotificationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION_MAX_PAGE_SIZE)
    .default(NOTIFICATION_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["all", "read", "unread"]).default("all"),
});
