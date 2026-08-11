# Google Calendar sync

Phase 11 adds a recruiter-specific Google Calendar connection. It is separate
from Google sign-in: signing in never grants Calendar access, and connecting a
calendar never creates or changes a HireFlow login identity.

## Google Cloud setup

Use the existing Google OAuth web client or create one, enable the Google
Calendar API, and register both development callback URLs exactly:

- `http://localhost:5173/api/auth/google/callback` for sign-in
- `http://localhost:5173/api/recruiter/calendar/callback` for Calendar consent

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Generate a separate 32-byte
encryption key (`openssl rand -base64 32`) and set
`CALENDAR_TOKEN_ENCRYPTION_KEY`. Refresh tokens are encrypted with AES-256-GCM
before they reach `recruiter_calendar_connections.google_refresh_token`; the
key is never stored in the database.

The Calendar flow requests `calendar.events` with offline access and explicit
consent. A recruiter connects it from `/recruiter/settings`.

## Runtime behavior

- Scheduling without a connection keeps the Phase 3 behavior: the interview
  date saves and `calendar_sync_status` is `not_synced`.
- Scheduling with a connection creates a 60-minute primary-calendar event,
  invites the candidate, requests Google Meet conference data, and stores the
  Google event ID and Meet link.
- Rescheduling patches the stored event ID. Clearing the date, rejecting the
  application, or closing its job deletes the event and sends attendee updates.
- OAuth refresh or Calendar API failures never roll back the interview date.
  They set `calendar_sync_status` to `failed` so the recruiter sees a clear
  reconnect/retry state.
- `GET /api/recruiter/calendar` includes upcoming, non-rejected interviews for
  active jobs belonging to the caller's company only.

## Verification boundary

Automated tests use real Postgres rows and the real application routes while
replacing only Google's outbound HTTPS responses. A genuine event/Meet link
still requires valid Google credentials and a human consent round-trip; do not
claim the production-provider steps passed until that manual run is completed.
