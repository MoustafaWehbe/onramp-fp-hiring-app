# Realtime transport — decision and shape

Phase 4 needed one push mechanism serving two features: in-app notifications
and live pipeline/dashboard updates. This documents what was chosen, why, and
what the resulting wiring looks like.

## Decision: Server-Sent Events, not WebSockets

**Chosen: SSE** (`GET /api/notifications/stream`, `text/event-stream`).

| Consideration | SSE | WebSocket |
|---|---|---|
| Direction needed | Server → client only. Every event in scope (a notification, a changed pipeline row) originates on the server. | Full duplex, more than the feature needs. |
| Auth | The app authenticates with an HttpOnly `accessToken` cookie. `EventSource` with `withCredentials: true` sends it, so the stream reuses the existing `authenticate` middleware unchanged. | The HTTP upgrade handshake bypasses Express middleware; cookie parsing and JWT verification would have to be reimplemented on the upgrade event. |
| Dependencies | None. Express already streams. | `socket.io` is not installed; `ws` is only present transitively (a dependency of a dependency), so using it means adding a direct runtime dependency. |
| Reconnection | Built into `EventSource`, plus an explicit backoff for the case the browser gives up on (see below). | Hand-rolled. |
| Dev proxy | The existing Vite `/api` proxy forwards the stream with no config change. | Needs `ws: true` added to the proxy. |
| Cost | One HTTP connection per tab; browsers cap ~6 per origin on HTTP/1.1. Acceptable here. | Cheaper at very high tab counts. |

The deciding factor is the auth story: SSE inherits the cookie session and the
existing middleware stack for free, while WebSockets would have meant a second,
parallel authentication path for no functional gain.

**Known limitation.** The ~6-connections-per-origin cap on HTTP/1.1 is per
browser+origin. A user with many tabs of this app open can exhaust it. HTTP/2
removes the cap; if that becomes a real problem before then, the fix is a
`BroadcastChannel` leader election so one tab holds the stream and relays to
the others — not a rewrite to WebSockets.

## Cross-process fan-out

The API process holds the open SSE connections, but not every event originates
there. A fit score is computed in the **workers** process (phase 2), so an
in-process `EventEmitter` would silently drop the single most important live
update in the product.

Events therefore travel over **Redis pub/sub** — already a dependency via
BullMQ — on a channel that carries the same prefix as the queues, so test runs
stay isolated from development.

```
candidate applies ─┐
recruiter moves ───┼─> API   ──publish──┐
interview edited ──┘                    │
                                   Redis channel  ──subscribe──> API process
fit score lands ────> workers ──publish─┘                        (fans out to
                                                                  its own SSE
                                                                  connections)
```

This also means a second API instance behind a load balancer works without
further changes: each subscribes and serves the connections it holds.

## Authorization

Recipients are resolved **at publish time**, never at delivery time. Each
message on the bus is `{ userIds: string[], event }`, and the delivering
process only matches those ids against its connection registry.

- `notification` — one row per recipient, so the message names exactly that user.
- `application.changed` — recipients are the recruiters whose company owns the
  job (`publishApplicationChanged` in `packages/shared/realtime`).

Because the company check happens where the job is already loaded, the socket
layer never makes an authorization decision, and a recruiter at another company
is not merely filtered out client-side — the event is never addressed to them.

## Reliability

- **Heartbeat.** A `: keepalive` comment every 25s stops proxies from closing
  an idle stream.
- **Reconnect.** `EventSource` retries dropped connections itself. It gives up
  permanently when the server answers with an error status, which is what
  happens when the 15-minute access token expires mid-stream — so the client
  wrapper adds its own capped exponential backoff for the `CLOSED` state.
- **Catch-up.** Events are not replayed. On every *re*-connect the client
  invalidates the notification and application queries, so anything missed
  while offline is refetched from the database rather than lost. Notifications
  are persisted regardless of whether the recipient was connected.
- **Rate limiting.** The stream path is exempt from the global 100-req/15-min
  limiter — a brief outage would otherwise burn the budget on reconnect
  attempts and lock the session out. It is bounded by a per-user cap of 8
  concurrent connections instead, which is the resource that actually matters.
- **Best-effort by design.** Publishing never fails the request that triggered
  it. The push is a convenience over data already committed; a Redis outage
  degrades the app to "refresh to see changes", not to an error.

## Not included

- **Email.** No mail provider is configured in this repository (no
  `nodemailer`, SendGrid, Resend, Postmark, or SMTP credentials in `.env`).
  Per the phase brief, no new email service was introduced. `emailQueue`
  exists in `packages/shared/queue` but has no processor. In-app notifications
  are the only delivery channel today; wiring email is a separate decision
  about which provider to adopt.
- **Web Push / mobile push**, and a **notification preferences screen** — both
  explicitly out of scope for this phase.
