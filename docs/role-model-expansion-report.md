# Role Model Expansion — Report

Branch: `feat/expand-role-model` (stacked on `refactor/unify-orm-sequelize`)
Date: 2026-07-12

Expands the User role model from `ENUM('admin','user')` to the four canonical
Hireflow roles: `ADMIN`, `RECRUITER`, `INTERVIEWER`, `CANDIDATE`.

Delivered as two commits: an infrastructure fix that unblocks the build/lint
verification gates, then the role-model work itself.

---

## Commit 1 — `chore(build): fix workspace build + lint infrastructure`

Pre-existing breakages on the base branch, fixed here (separately scoped) so
the role-model commit can be verified green. Not part of the role model.

| File | Change |
| --- | --- |
| `packages/shared/package.json` | `main`/`types` now point at compiled `dist/src/index.*` instead of raw `src/index.ts`; lint script quoting fixed for Windows and widened to all source dirs |
| `packages/api/tsconfig.json`, `packages/workers/tsconfig.json` | Removed `paths` that compiled shared **source** across each package's `rootDir` — the cause of the TS6059 error wall and of `.js`/`.d.ts` junk being emitted next to shared's sources |
| `packages/shared/.gitignore` | New; guards against those emitted artifacts ever being committed |
| `packages/api/eslint.config.mjs`, `packages/shared/eslint.config.mjs` | New flat ESLint configs extending `packages/shared/config/eslint.config.js` |
| `packages/api/src/middleware/validate.ts` | Fixed TS2352 (`Request` → `unknown` → record) |
| `packages/api/app.ts` | Removed stray backticks (pre-existing typo, surfaced by lint) |
| `packages/api/src/middleware/error-handler.ts` | Removed stale `eslint-disable` |
| `packages/shared/db/models/{User,Session,RefreshToken}.ts` | Empty `*CreationAttributes` interfaces → type aliases (`no-empty-object-type`) |

Verified standalone (role work stashed): build + lint green in `shared`,
`api`, `web`; `workers` builds; api jest suite passes; `git status` clean
after full builds (no junk emission).

---

## Commit 2 — the role model

### Files changed

**Shared (`packages/shared`)**

- `auth/types.ts` — `UserRole` now derived from a `USER_ROLES` const:
  `ADMIN | RECRUITER | INTERVIEWER | CANDIDATE`. `JwtPayload` and `AuthUser`
  inherit it.
- `auth/roles.ts` (new) — role helpers: `isInternalRole()`, `isUserRole()`,
  `INTERNAL_ROLES`, `SELF_ASSIGNABLE_ROLES` (excludes `ADMIN`).
- `auth/index.ts` — exports the helpers.
- `db/models/User.ts` — `role` is `DataTypes.STRING(20)`, `allowNull: false`,
  `defaultValue: "CANDIDATE"`, `isIn` validator over the four values.

**API (`packages/api`)**

- `src/migrations/20260712120000-expand-user-role-to-varchar-check.js` (new).
- `src/schemas/auth.schemas.ts` — `registerSchema` accepts optional `role`
  validated against `CANDIDATE | RECRUITER | INTERVIEWER` only. `ADMIN` (and
  anything else) fails with 422 `"role must be one of CANDIDATE, RECRUITER,
  INTERVIEWER"`. Admin is granted only by seeder or by another admin.
- `src/services/auth.service.ts` — `register()` uses the submitted role,
  defaulting to `CANDIDATE`; role is returned in the response and flows into
  the JWT payload via login/refresh as before.
- `src/seeders/20240101000000-admin-user.js` — seeds `role: "ADMIN"`.
- `openapi.yaml` — register `role` documented as the three self-assignable
  values.
- `tests/unit/*.test.ts` — fixtures moved from `"user"` to `"CANDIDATE"`.

**Web (`packages/web`) — types/mapping only, no UI refactor**

- `src/types/users.ts` — `UserRole` = the four canonical uppercase roles.
- `src/lib/roles.ts` — `normalizeRole()` maps canonical roles (any casing) to
  platform roles; `ADMIN` → `recruiter`. Stale "backend only knows
  admin/user" comments corrected.
- `src/data/users.ts` — demo mock users carry canonical uppercase roles (mock
  session itself untouched).
- `src/providers/AuthProvider.tsx`, `src/pages/auth/Login.tsx` — comment-only
  updates; register still does not send a role (wiring `intendedRole` through
  is UI work for the next branch).

### Migration strategy

Postgres enums cannot be altered inside a transaction and cannot be cleanly
rolled back, so the enum is replaced with `VARCHAR(20)` + CHECK — every
statement is transactional, so `up` and `down` are each fully atomic.

`up` (single transaction):

1. `DROP DEFAULT` (the old default is typed `'user'::enum_users_role`).
2. `ALTER COLUMN role TYPE VARCHAR(20) USING (CASE role::text WHEN 'admin'
   THEN 'ADMIN' WHEN 'user' THEN 'CANDIDATE' ELSE role::text END)` — type
   conversion and row migration in one atomic statement. Unexpected values
   pass through so the CHECK below fails the whole transaction rather than
   silently mangling a row.
3. `SET DEFAULT 'CANDIDATE'` (column stays `NOT NULL`).
4. `ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','RECRUITER',
   'INTERVIEWER','CANDIDATE'))`.
5. `DROP TYPE enum_users_role` (plain drop, no CASCADE — any remaining
   dependency aborts and rolls back everything).

`down` reverses it: drop CHECK and default → recreate the enum → convert
back (`'ADMIN'` → `'admin'`, everything else → `'user'` — lossy by
necessity; the old schema cannot express the other roles) → restore default
`'user'`.

### Before / after of existing rows

| email | before | after |
| --- | --- | --- |
| admin@example.com | `admin` | `ADMIN` |
| candidate@example.com | `user` | `CANDIDATE` |
| rayanbouez@gmail.com | `user` | `CANDIDATE` |
| rayanbouezz@gmail.com | `user` | `CANDIDATE` |

No rows lost; zero rows outside the four allowed values (checked by SQL).

### Test results

- Migration applies cleanly (`sequelize-cli db:migrate`, 0.05s) and the
  **down/up round-trip was executed against the dev DB**: undo restored
  `enum_users_role` + `admin`/`user` values exactly, re-apply reproduced the
  target state.
- Post-migration SQL checks: column is `character varying(20)` NOT NULL
  default `'CANDIDATE'`; `users_role_check` present with the four values;
  `pg_type` contains no `enum_users_role`; 0 invalid rows.
- Live register tests against a running API (port 3999, dev DB):
  - `role=RECRUITER` → 201, row lands with `RECRUITER`, login JWT payload
    contains `"role":"RECRUITER"`.
  - `role=ADMIN` → **422 rejected**, no row created.
  - no role → 201 with `CANDIDATE`.
  - (test users were deleted afterwards; dev DB left with its original 4
    rows, migrated.)
- Builds/lints/tests: `shared` build+lint green; `api` build+lint green,
  jest 2 suites / 10 tests pass; `web` build+lint green; `workers` builds.

Known cosmetic nit (not a regression): `Settings.tsx` renders the raw role,
which now displays uppercase (e.g. `CANDIDATE`). Display formatting is UI
work for a later branch.

### Suggested commit message

```
feat(auth): expand user role model to four Hireflow roles

Replace users.role ENUM('admin','user') with VARCHAR(20) + CHECK over
ADMIN/RECRUITER/INTERVIEWER/CANDIDATE (transactional both ways; existing
rows migrate admin->ADMIN, user->CANDIDATE; enum type dropped). UserRole
and the User model follow, with role helpers (isInternalRole,
SELF_ASSIGNABLE_ROLES) in shared. Registration accepts an optional
self-assignable role (ADMIN is rejected; seeder-only), defaulting to
CANDIDATE, and the role flows through responses and JWT payloads. The
admin seeder and web role types/mapping are aligned; no UI refactor and
no domain tables — those are the next branches.
```
