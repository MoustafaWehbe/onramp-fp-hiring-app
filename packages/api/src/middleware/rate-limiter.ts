import rateLimit from "express-rate-limit";

const DEFAULT_WINDOW_MS = 15 * 60 * 1_000; // 15 minutes
const DEFAULT_MAX = 100;
const DEFAULT_AUTH_MAX = 10; // stricter limit for auth endpoints

// Positive-integer env overrides, falling back to the production-safe
// defaults above on anything unset, non-numeric, or <= 0 — so a typo'd or
// blank value in a teammate's .env can't accidentally disable the limiter.
function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const windowMs = positiveIntEnv("RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
const max = positiveIntEnv("RATE_LIMIT_MAX", DEFAULT_MAX);
const authMax = positiveIntEnv("AUTH_RATE_LIMIT_MAX", DEFAULT_AUTH_MAX);

export const rateLimiter = rateLimit({
  windowMs,
  max,
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
  windowMs,
  max: authMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});
