# Google / GitHub sign-in

Candidates and recruiters can authenticate with a provider instead of a
password. The session issued afterwards is the ordinary `accessToken` /
`refreshToken` cookie pair, so nothing downstream of login knows or cares which
door a user came through.

## Setup

1. Register an OAuth app with the provider and set the callback URL exactly:

   | Provider | Console | Callback URL |
   |----------|---------|--------------|
   | Google | [Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) | `http://localhost:5173/api/auth/google/callback` |
   | GitHub | [Developer settings](https://github.com/settings/developers) | `http://localhost:5173/api/auth/github/callback` |

2. Put the client id/secret pairs in `.env` (see `.env.example`).
3. Run the migration: `cd packages/api && npx sequelize-cli db:migrate`.

Providers are independent. Configure only Google and only the Google button
appears — `GET /api/auth/providers` reports which ones have credentials, and
the sign-in forms render from that list, so an unconfigured provider never
shows a button that can only fail.

> **If you already have a `.env`**, copying `.env.example` again is not how you
> get these — add the four keys to your existing file. Until you do, **no
> sign-in buttons appear at all.** That is working as intended, not a bug; see
> [Troubleshooting](#troubleshooting-no-buttons-appear).

**Why port 5173 in the callback URL:** Vite proxies `/api` to the API on 3000,
so routing the round-trip through the frontend origin keeps everything
same-origin. The session cookies the callback sets are then exactly the ones
the app sends on subsequent requests. In production, point
`OAUTH_CALLBACK_BASE_URL` and `APP_BASE_URL` at the deployed origin.

## Flow

```
/login  ──"Continue with Google"──▶  GET /api/auth/google?role=RECRUITER
                                       │  signs a state JWT into an HttpOnly
                                       │  cookie, 302s to Google
                                       ▼
                                     Google consent screen
                                       │
                                       ▼
                                     GET /api/auth/google/callback?code&state
                                       │  state check → code exchange →
                                       │  userinfo → user → session cookies
                                       ▼
                                     /auth/callback  ──▶ /auth/select-role   (new)
                                                     └─▶ workspace home    (returning)
```

## Decisions worth knowing

**No Passport.** `passport-google-oauth20` keeps the `state` nonce in an
`express-session`, and this app has no server-side session store — auth is JWT
cookies end to end. Adding `express-session` for the ten minutes a redirect is
in flight would mean running a second session system alongside the real one.
The authorization-code exchange is two HTTP calls, so it lives in
`src/services/oauth.service.ts` in the same shape as every other service.

**State is signed, not stored.** Same reason: nowhere server-side to put it.
The nonce travels in the query string and the signed copy in an HttpOnly
cookie; a callback has to satisfy both. The cookie is `SameSite=Lax` because
the provider returns the user by top-level navigation — `Strict` would withhold
the cookie on exactly the request that needs it.

**Email match never links accounts.** If a provider hands back an email that
already belongs to a password account, the flow stops with
`oauth_error=email_exists` and the user is told to log in with their password.
Linking on an email match would mean trusting the provider's claim that this
person controls that mailbox; when that claim is wrong, or the address was
never verified, it hands over someone else's account. Linking should be an
explicit act by an already-authenticated user (not built yet).

For the same reason, an account is never *created* on an address the provider
has not verified (`email_unverified`).

**New accounts owe a role.** A provider returns an identity, never a role, so
`users.role_selection_pending` marks the account until the user answers the
one-time "hiring or looking for work?" prompt. It reuses `RolePicker` and
`SELF_ASSIGNABLE_ROLES` — the same three roles the signup form offers, ADMIN
excluded. `ProtectedRoute` sends a pending user to the prompt from any URL,
because until they answer, `role` is still sitting on its `CANDIDATE` default
and would drop them in the wrong workspace.

Answering re-issues the session: `authorize()` reads the role off the JWT, so a
new recruiter holding a candidate token would be refused at every recruiter
route until it expired.

**Recruiters still hit the company gate.** An OAuth recruiter is created with
`companyId` null, exactly like a password recruiter, so `GET /api/companies/me`
404s and job creation stays blocked until the profile is complete. No new code
— that is the point.

## Failure modes

Every failure is a 302 to `/login?oauth_error=<code>&provider=<provider>`; the
callback runs in a browser redirect, so a query param is the only channel back
to the user. Provider-side detail (bad credentials, quoted provider responses)
is logged server-side and deliberately kept out of the URL.

| Code | Cause |
|------|-------|
| `access_denied` | User declined at the consent screen |
| `email_exists` | Email already belongs to a password account |
| `email_missing` / `email_unverified` | Provider returned no email, or one it will not vouch for |
| `invalid_state` / `missing_code` | State did not verify, expired, or the callback came back incomplete |
| `provider_not_configured` | No client id/secret for that provider |
| `provider_error` | Token exchange rejected, provider unreachable, or anything unexpected |

Wording lives in `packages/web/src/lib/oauth.ts`.

## Troubleshooting: no buttons appear

Almost always missing credentials, not a rendering bug. The API says which on
startup:

```
OAuth sign-in: no providers configured — the "Continue with…" buttons are hidden.
```

```
OAuth sign-in enabled for: google, github
```

If it says none are configured, add the keys to `.env` and restart the API.
Check in this order before suspecting the frontend:

1. **`curl http://localhost:3000/api/auth/providers`**
   `{"data":{"providers":[]}}` means the backend has no credentials — the
   frontend is behaving correctly by rendering nothing. `{"data":{"providers":
   ["google"]}}` means the backend is fine and the problem is downstream.
2. **`curl http://localhost:5173/api/auth/providers`** — same answer proves the
   Vite proxy is wired up. A connection error means the API is not running or
   is on a different port.
3. Only if both return providers and the buttons are still missing is it a
   frontend problem.

**Do not put placeholder values in `GOOGLE_CLIENT_ID` to make the buttons
appear.** They will render and then fail at the consent screen, which is a
worse failure than a hidden button — you need real credentials from the
consoles linked above. Creating a Google OAuth client for local development
takes a few minutes: create a project, configure the consent screen as
**External** with your own account as a test user, then create an **OAuth
client ID** of type **Web application** with the callback URL from the table
above. GitHub is quicker — **New OAuth App**, fill in the callback URL, and
generate a client secret.

## Testing

`tests/integration/oauth.routes.test.ts` fakes only the two outbound HTTP calls
(token exchange, userinfo) and runs everything else for real: state check,
uniqueness constraint, session issuance, and the company gate afterwards.

What no test covers is the consent screen itself. Before shipping a change to
this flow, click through it once against real credentials.
