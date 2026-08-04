import type { NextFunction, Request, Response } from "express";

import { notificationService } from "../services/notifications.service";
import { registerRealtimeClient } from "../services/realtime.service";

export const notificationController = {
  async list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { limit, offset, status } = req.query as unknown as {
        limit: number;
        offset: number;
        status: "all" | "read" | "unread";
      };
      const result = await notificationService.list(req.user!.userId, {
        limit,
        offset,
        status,
      });

      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  async markRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const notification = await notificationService.markRead(
        req.user!.userId,
        req.params.id as string,
      );

      res.status(200).json({ data: notification });
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await notificationService.markAllRead(
        req.user!.userId,
      );

      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * The SSE stream. Held open for the life of the session, so it deliberately
   * bypasses the JSON response shape every other endpoint uses.
   */
  stream(req: Request, res: Response): void {
    res.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx and friends not to buffer the stream into uselessness.
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    // Browsers back off using this value after a drop; the default of 3s is
    // fine, but stating it makes reconnect behaviour explicit rather than
    // implementation-defined.
    res.write("retry: 3000\n\n");
    res.write(`event: ready\ndata: {"userId":"${req.user!.userId}"}\n\n`);

    const unregister = registerRealtimeClient(req.user!.userId, res);

    req.on("close", () => {
      unregister();
      res.end();
    });
  },
};
