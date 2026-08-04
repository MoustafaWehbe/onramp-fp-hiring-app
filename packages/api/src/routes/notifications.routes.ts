import { Router } from "express";

import { notificationController } from "../controllers/notifications.controller";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "../schemas/notifications.schemas";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

const router = Router();

// Every route is self-scoped to req.user — a notification belongs to exactly
// one recipient, so there is no ownership guard to run, only a WHERE clause.
router.use(authenticate);

router.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  notificationController.list,
);
router.get("/stream", notificationController.stream);
router.patch("/read-all", notificationController.markAllRead);
router.patch(
  "/:id/read",
  validate(notificationIdParamSchema, "params"),
  notificationController.markRead,
);

export { router as notificationRouter };
