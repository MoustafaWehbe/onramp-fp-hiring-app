# Candidate "Complete Profile" Feature — Audit & ORM Decision Brief

> Read-only audit. No code was changed, created, or deleted to produce this.
> Goal: establish exactly what the profile feature is, which ORM it uses, and the
> facts needed to decide **keep Prisma** vs **remove Prisma / port to Sequelize**.

## Headline findings (read this first)

1. **The "complete profile" feature is a data-model declaration, not a working feature.**
   As committed (PR #3, commit `a37598c`, author *Noura Al Hassanieh*), it consists of
   **exactly two files**: an edit to `packages/api/prisma/schema.prisma` and one Prisma
   migration SQL file. **59 insertions total.** There are **no** profile endpoints,
   controllers, services, validation schemas, or frontend wiring. No work-experience, skills,
   or CV-upload code exists anywhere.
2. **It uses Prisma** — but only at the *schema* level. No runtime code reads or writes
   `CandidateProfile` / `Company` yet.
3. **Prisma has never actually run against the database.** The live Postgres contains **only
   the Sequelize tables** (`users`, `sessions`, `refresh_tokens`). There is no
   `_prisma_migrations` table and no `User`/`Company`/`CandidateProfile` tables.
4. **The backend does not build.** `packages/api` fails `tsc` with syntax errors in
   `auth.controller.ts` (dangling methods at lines 143/147/151), independent of the profile work.
5. **The two ORMs describe different, incompatible schemas** of the same data: Sequelize =
   snake_case + UUID + `enum('admin','user')` (this is what physically exists); Prisma =
   PascalCase + `cuid()` + role plain-string `"CANDIDATE"` (this is what the code expects but
   the DB does not have).
6. **Bottom line for the decision:** porting the profile feature to Sequelize would throw away
   ~59 lines of schema/SQL and **zero** business logic. The real cost of either direction is in
   the **auth layer and the ORM unification**, not the profile feature.

---

## Step 0 — What is being audited

| | |
|---|---|
| Branch | **`main`** |
| Head | `99f4313` (Merge PR #4) |
| Working tree | **Clean**, except one untracked junk file: `ponsive Hireflow frontend design"` (accidental artifact — trailing `"` in the name; **not touched**) |
| Profile feature present here? | **Yes**, merged via **PR #3** (`feat/database-company-profile`) → commits `a37598c` + merge `a0f1648` |

Relevant history:
```
99f4313 Merge PR #4 (frontend-auth-onboarding-ux)
a0f1648 Merge PR #3 (feat/database-company-profile)
a37598c feat(database): add Company and CandidateProfile models   ← the profile feature
...
d403f62 add API contract and auth endpoints
```

---

## Step 1 — Map of the profile feature

**Everything the feature added (the complete list):**

| File | Layer | What it does |
|---|---|---|
| `packages/api/prisma/schema.prisma` | Data model (Prisma) | Adds `Company` and `CandidateProfile` models; adds a `candidateProfile CandidateProfile?` relation to `User` |
| `packages/api/prisma/migrations/20260702200008_add_company_candidate_profile/migration.sql` | Migration (Prisma) | Creates `"Company"` and `"CandidateProfile"` tables + unique index on `userId` + FK to `"User"` |

**What was NOT added (searched the whole repo):**

| Expected for a "complete profile" feature | Present? |
|---|---|
| API endpoints for profile create/update | ❌ None. Only `/auth/*` routes exist. |
| Work-experience endpoints/model | ❌ None (no model, table, or route). |
| Skills endpoints/model | ❌ None. |
| CV / resume upload endpoint | ❌ None. `resumeUrl` is a column only; no upload handler, no storage wiring. |
| Profile controller / service | ❌ None. `find packages/api/src` shows only `auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`. |
| Validation schema for profile | ❌ None (only `auth.schemas.ts`). |
| Frontend profile page consuming the API | ❌ **Static mock.** |

**Frontend reality** — `packages/web/src/pages/profile/ProfilePage.tsx`:
- Imports `candidateProfile` from `../../data/users` (hard-coded mock data) and renders it.
- Makes **no** API calls. The only `apiClient` calls in the whole web app are
  `/auth/register`, `/auth/logout`, `/auth/me` (in `AuthProvider.tsx`).
- The page literally states: *"Add portfolio links later when backend profile editing is
  connected."* → confirms it is not wired to any backend.

So the frontend "profile" and the backend "profile schema" are **unconnected**; neither knows
about the other.

---

## Step 2 — Which ORM does the profile feature use?

**Prisma — at the schema layer only.** There is no runtime database operation for the profile
feature yet (no code queries `CandidateProfile`/`Company`), so there is nothing to trace to a
`.create()`/`.findUnique()` call. The evidence:

- **Import / declaration:** `packages/api/prisma/schema.prisma` (Prisma schema language). New models:
  ```prisma
  model Company {
    id String @id @default(cuid())
    name String
    website String?
    description String?
    createdAt DateTime @default(now())
  }
  model CandidateProfile {
    id String @id @default(cuid())
    headline String?  bio String?  location String?  resumeUrl String?
    userId String @unique
    user   User   @relation(fields: [userId], references: [id])
    createdAt DateTime @default(now())
  }
  ```
- **Migration:** `...add_company_candidate_profile/migration.sql` is a Prisma-generated SQL
  migration (`CREATE TABLE "Company"`, `CREATE TABLE "CandidateProfile"`,
  `ALTER TABLE "CandidateProfile" ADD CONSTRAINT ... FOREIGN KEY ("userId") REFERENCES "User"("id")`).

**Answers to the specific questions:**

- **Does the profile feature depend on Prisma at runtime?** Not yet — no service/controller
  references `CandidateProfile` or `Company`. It only *declares* Prisma tables. The Prisma
  runtime dependency in the repo comes from the **auth** code, not the profile code (see Step 3).
- **Did it add new tables? Via which ORM?** Yes — `Company`, `CandidateProfile`. **Prisma
  migration only.** No Sequelize migration for these tables exists.
- **Did it modify `prisma/schema.prisma`?** Yes. It added the two models and the `User →
  candidateProfile` back-relation. (Note: `User` in this schema was **already** `cuid()` +
  `role String @default("CANDIDATE")` **before** the profile commit — that shape came from an
  earlier commit, not this feature.)
- **Did it change the User model or the role enum?** Only additively — it added the
  `candidateProfile` relation field to `User`. It **did not** change the role representation.
  Worth knowing: in this Prisma lineage `role` has always been a **plain `String`**
  (`@default("CANDIDATE")`), **not a Prisma enum**. The Sequelize side uses
  `ENUM('admin','user')`. These two role definitions already disagreed before the profile
  feature and still do.

---

## Step 3 — ORM state of the whole backend right now

### 3a. Who imports Prisma vs Sequelize

**Prisma (`@prisma/client`) importers — 2 files, both in the auth path:**
- `packages/api/src/services/auth.service.ts` → `import { PrismaClient } from "@prisma/client"; const prisma = new PrismaClient();`
- `packages/api/src/controllers/auth.controller.ts` → `import { PrismaClient } from "@prisma/client"; const prisma = new PrismaClient();` (used only by dead duplicate functions — see Step 4)

**Sequelize models — defined but never wired to a live connection:**
- Real definitions: `packages/shared/db/models/{User,Session,RefreshToken,index}.ts` (class-based, `initModel`).
- Re-export shims: `packages/api/src/models/{User,Session,RefreshToken}.ts` → `export { X } from "@starter-kit/shared";`
- **Never invoked at runtime:** a repo-wide search for `initModels(`, `.authenticate()`,
  `.sync(`, `getSequelize(`, `createSequelize(` finds **no runtime call** in `packages/api` or
  `packages/workers`. `server.ts` has `initializeDatabase()` commented out and
  `src/lib/db.ts` is a no-op stub. **The Sequelize models are effectively dead code at runtime.**

> ⚠️ Caveat on grep noise: many files `import ... from "@starter-kit/shared"`, but for **JWT
> helpers, AI, or queue utilities** — not DB models. The only Sequelize *model* consumers are
> the files listed above.

### 3b. State of `prisma/schema.prisma` and migrations

- **Current `schema.prisma`:** `User` (cuid, `role String @default("CANDIDATE")`, no
  `Session`/`RefreshToken`, **no `@@map`**), `Company`, `CandidateProfile`. Because there is no
  `@@map`, Prisma expects **PascalCase** tables (`"User"`, `"Company"`, `"CandidateProfile"`).
- **`prisma/migrations/`:**
  - `20260627003515_init/migration.sql` — **still present** (the previously-noted stale one).
    Creates a PascalCase `"User"` with `TEXT id` and `role TEXT DEFAULT 'CANDIDATE'`. This does
    **not** match the physical `users` table (snake_case, UUID, `enum('admin','user')`).
  - `20260702200008_add_company_candidate_profile/migration.sql` — the profile migration; its FK
    targets `"User"("id")`, which only exists if the stale `init` migration runs first.
  - `migration_lock.toml` → provider `postgresql`.

### 3c. Which tables physically exist (verified against the running Postgres)

Docker Postgres is up (`onramp-fp-hiring-app-postgres-1`, `postgres:16-alpine`, healthy). I
inspected it **read-only** (`\dt`, `SELECT` on tracking tables — no migrations run, no mutation):

```
Database: starter_kit
 public | SequelizeData   | table   ← Sequelize seeder tracking
 public | SequelizeMeta   | table   ← Sequelize migration tracking
 public | refresh_tokens  | table
 public | sessions        | table
 public | users           | table
```
- `SequelizeMeta` shows **`20240101000000-create-auth-tables.js`** applied.
- `_prisma_migrations` table: **does not exist** → **no Prisma migration has ever been applied.**
- No `User` / `Company` / `CandidateProfile` (PascalCase) tables exist.

**Consequence:** the physical schema is 100% **Sequelize's**. The Prisma client (auth) expects
tables that are not there. Running the app's Prisma auth against this DB would fail with
"relation \"User\" does not exist" even if the code compiled.

> To make Prisma's tables exist you would need `prisma migrate deploy` (runs *both* migrations,
> creating a **parallel** PascalCase `User`/`Company`/`CandidateProfile` set **alongside** the
> Sequelize `users`/`sessions`/`refresh_tokens`) — plus `prisma generate` for the client. Not
> done here, per the read-only constraint.

---

## Step 4 — Does it actually work?

| Check | Result | Detail |
|---|---|---|
| `packages/api` build (`tsc`) | ❌ **FAIL** | `src/controllers/auth.controller.ts(143,1) TS1434: Unexpected keyword or identifier` (also 147, 151). Cause: dangling `async refresh(req,res){}` / `logout` / `me` methods pasted at **module top level** after the `authController` object closes (line 107), plus dead duplicate `register`/`login` consts. |
| `@prisma/client` generated? | ❌ **No** | No `node_modules/.prisma/client`. A working Prisma path would also need `prisma generate`. (Build dies on the syntax error first.) |
| `packages/api` lint | ❌ **FAIL (script broken)** | `eslint '...' 'app.ts'` uses single-quoted globs → on Windows ESLint receives the literal `'app.ts'`: *"No files matching the pattern"*. Environment/script bug, unrelated to profile. |
| `packages/api` tests | ⚠️ **1 of 2 suites fail** | `auth.controller.test.ts` → *"Test suite failed to run"* (same TS1434 syntax errors). `auth.service.test.ts` → **PASS (5 tests)**. |
| `packages/web` build (`tsc && vite build`) | ✅ **PASS** | Built clean. |
| `packages/web` lint | ✅ **PASS** | Clean. |

**Can the endpoints run?**
- **Profile endpoints:** none exist — nothing to run.
- **Auth endpoints:** cannot run as-is. The package doesn't compile. Even after fixing the
  syntax error, the current Prisma auth path is broken independently:
  - `auth.service.login()` returns only `{ user }` (no `accessToken`/`refreshToken`), but
    `auth.controller.login` destructures `{ user, accessToken, refreshToken }` and calls
    `setAuthCookies(res, undefined, undefined)`.
  - `getProfile()` returns the **full user record including the password hash** (leak).
  - Prisma would query PascalCase tables that don't exist in the DB (Step 3c).
  - Requires env (`DATABASE_URL`), `prisma generate`, and a Prisma migration to have any chance.

---

## Step 5 — Decision brief: keep Prisma vs remove it

**Framing:** The profile feature is trivial (2 declarations, no logic). The decision is really
about the **auth/ORM foundation**. Today that foundation is **split and broken**: the *live
database and the only real models are Sequelize*; the *runtime auth code is Prisma but does not
build, has never been migrated, and points at non-existent tables*. Either option must (a) fix
the broken `auth.controller.ts` and (b) unify on one schema. Neither option is "leave it as is."

### Option A — Keep Prisma (adopt the teammate's approach)

Make Prisma the real domain ORM and retire Sequelize.

**What must change:**
1. **Reconcile schema ↔ physical DB.** Either add `@@map`/`@map` so Prisma models point at the
   existing snake_case tables (`users`, `sessions`, `refresh_tokens`), **or** migrate the DB to
   Prisma's PascalCase/cuid tables and abandon the Sequelize tables (loses the seeded admin).
   The two migration ledgers (`SequelizeMeta` vs `_prisma_migrations`) must be unified.
2. **Re-add `Session` + `RefreshToken` to `schema.prisma`** if you want real refresh/session
   auth — the current Prisma schema dropped them, and the Prisma `auth.service` no longer issues
   tokens. Otherwise accept a simplified/stateless auth.
3. **Generate + wire Prisma:** add `prisma generate` to install/build, run `prisma migrate` in
   dev/CI, ensure `DATABASE_URL` is set.
4. **Fix `auth.controller.ts`** (remove dangling methods + dead duplicates) and make
   `auth.service.login` actually mint tokens; stop returning the password hash.
5. **Unify role model:** Prisma `"CANDIDATE"` string vs Sequelize `enum('admin','user')` vs
   frontend `candidate|recruiter|interviewer`. Pick one.
6. **Retire Sequelize:** delete `shared/db/models`, `api/src/models` shims, the Sequelize
   migration/seeder, `.sequelizerc`, `config/database.js`, and `sequelize`/`sequelize-cli` deps —
   and re-express the admin seed as a Prisma seed script.

**Effort: Medium.** The profile part is free; the cost is DB/schema reconciliation, Prisma
generation wiring, fixing the broken auth path, and pulling out Sequelize.
**What breaks:** the currently-applied Sequelize schema + seeded admin (if you switch table
shapes); session/refresh-token auth (already dropped in the Prisma path); anything assuming UUID
ids (Prisma uses `cuid()` strings).

### Option B — Remove Prisma, port profile to Sequelize

Keep the ORM that already matches the live database.

**What must change:**
1. **Port the profile models to Sequelize:** re-express `Company` + `CandidateProfile` as
   class-based Sequelize models (UUID PK, `underscored`, snake_case) + **one** Sequelize
   migration. This is the **only** teammate work to redo (~59 schema lines → ~80 Sequelize lines).
2. **Rewrite the auth service/controller off Prisma** onto the existing Sequelize
   `User`/`Session`/`RefreshToken` models — which **already exist and already match the physical
   tables** (no DB migration needed for auth). *(Note: a Sequelize-shaped auth service already
   exists on the branch `feature/auth-backend-prisma`/earlier history and could be reused.)*
3. **Actually wire Sequelize at boot:** call `initModels()` + establish the connection in
   `server.ts` (currently never done).
4. **Fix `auth.controller.ts`** (same syntax fix as Option A).
5. **Remove Prisma:** delete `@prisma/client`/`prisma` deps, `prisma/` folder, schema, and
   migrations.

**Effort: Small–Medium.** The profile port is **Small** (trivial). The bulk is the auth
rewrite off Prisma — but it aligns with the DB that already exists (no data migration, no
`prisma generate`, no ledger reconciliation), and the Sequelize models are already written.
**What breaks:** nothing that currently works (the Prisma auth path doesn't build or run today).
You discard the Prisma schema + migration.

### How much *working* code would Option B throw away?

**Effectively none.** The teammate's contribution is **40 lines of Prisma model + a 29-line
generated SQL migration** (59 insertions), and it has **never been applied, is not covered by
any test, is not called by any endpoint or service, and is not consumed by any frontend.** No
business logic, API surface, validation, or UI depends on it. "A teammate already built this"
describes a **data-model declaration**, not a functioning feature — porting it to Sequelize is
re-typing ~2 small models, not rewriting real work.

### Neutral summary for the team

| | Option A (keep Prisma) | Option B (remove Prisma) |
|---|---|---|
| Profile port cost | Free (already Prisma) | Small (~2 models + 1 migration) |
| Matches live DB today | ❌ No (needs reconciliation/migration) | ✅ Yes (Sequelize is what exists) |
| Auth rewrite needed | Yes (fix + re-add sessions + tokens) | Yes (port to existing Sequelize models) |
| `prisma generate` / migrate wiring | Required | Removed |
| Discards | Sequelize models + applied schema + admin seed | ~59 lines of Prisma schema/SQL |
| Effort | Medium | Small–Medium |

Both paths require fixing the broken `auth.controller.ts` and choosing a single role model —
those are unavoidable regardless of ORM.

---

*This document reports facts and tradeoffs only; it does not make the decision. No files were
modified.*
