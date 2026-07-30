import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000, // 15 minutes
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  // The SSE stream is one long-lived request that a browser re-opens every
  // few seconds while the network is down. Counting those against a 100-per-
  // 15-minutes budget would turn a brief outage into a locked-out session, so
  // the stream is bounded by a per-user connection cap in realtime.service
  // instead of by request rate.
  skip: (req) => req.path === "/notifications/stream",
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 10, // stricter limit for auth endpoints
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});
