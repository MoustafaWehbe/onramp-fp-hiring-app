# Recruiter/Company-Profile Branch Audit — `feat/domain-models` (PR #9)

> **Read-only audit.** Nothing was fixed, merged, or deleted to produce this. A
> trial merge was run and then explicitly aborted (Step 1). This is the shared
> checklist for Noura and Rayan to work through together.

## Step 0 — Which branch is this

| | |
|---|---|
| Branch | `feat/domain-models` (local, tracking `origin/feat/domain-models`) |
| HEAD at time of audit | `3434800` — "feat: connect recruiter pages to backend APIs" |
| This is **PR #9**, not PR #7 | PR #7 ("feat(db): add full HireFlow domain data model", commit `9a35890`) is an **older, already-merged** commit that happens to sit in this branch's ancestry — the branch **name** `feat/domain-models` was reused for new work. |
| New commits on top of the shared ancestor | `02b382a` "feat: create job posting endpoint" · `b26275a` "feat: attach skills to job" · `456141c` "feat: implement application and candidate workflows" · `3434800` "feat: connect recruiter pages to backend APIs" |
| Author of all 4 new commits | **Noura Al Hassanieh** `<nouraelhassanieh@gmail.com>` |
| Verified against GitHub | `git ls-remote origin refs/heads/feat/domain-models` → `3434800e01c86a1a80e1acf547c1931a58e570f5`, matching local exactly. This audit reflects the current live state of PR #9. |
| main, for reference | `origin/main` is at `20c8805` (merge of PR #8, `feat/candidate-profile-rbac` — the RBAC foundation + candidate profile API). `origin/feat/domain-models` is **4 commits ahead of, and 3 commits behind,** `origin/main`. |

---

## Step 1 — The merge conflict

Ran `git fetch origin`, fast-forwarded local `feat/domain-models` to match origin exactly, then:
```
git merge origin/main --no-commit --no-ff
```

**Exactly one conflicted file:** `packages/api/src/routes/index.ts`. Every other file merged cleanly (see Step 4 for why — she never touched anything main also touched, except this one file). Then `git merge --abort` — confirmed working tree clean and HEAD unchanged (`3434800`) afterward.

### The conflict itself

```
<<<<<<< HEAD  (this branch)
import { companyRouter } from "./company.routes";
import { jobRouter } from "./jobs.routes";
import { skillRouter } from "./skills.routes";
import { jobSkillRouter } from "./job-skills.routes";
import { candidateProfileRouter,} from "./candidate-profiles.routes";
import { applicationRouter,} from "./applications.routes";
=======  (main)
import { candidateRouter } from "./candidate.routes";
>>>>>>> origin/main
```
...and the matching `router.use(...)` block below it.

- **This branch changed:** registered 6 new routers — `company`, `jobs`, `skills`, `job-skills`, `candidate-profiles`, `applications`.
- **Main changed:** registered 1 new router — `candidate` (my RBAC-secured candidate-profile API from PR #8).
- **Why they collide:** both branches independently inserted new `import`/`router.use()` lines at the same location in the same file. This is a **textual** conflict only — the two sets of routes don't overlap in URL space and don't depend on each other.
- **Which should win:** **both** — this is a "combine, don't choose" conflict. The resolved file needs all 7 routers registered (hers + mine). Trivial to resolve by hand once someone owns it.

**But — and this is the real finding —** two of her new routes and my one new route are **not actually independent**: her `/candidate-profiles` and main's `/candidate` are two separately-built implementations of *the same feature* (see Step 2/3). The routes/index.ts conflict is what surfaces this, but the conflict resolution itself doesn't fix the underlying duplication — see the resolution brief in Step 8.

**Files that "merged cleanly" from main** (all pure additions from PR #8, no interaction with anything on this branch): `src/lib/ownership.ts`, `src/lib/serializers.ts`, `src/lib/storage/*`, `src/lib/resume-upload.ts`, `src/middleware/upload-error.ts`, `src/controllers/candidate.controller.ts`, `src/services/candidate.service.ts`, `src/routes/candidate.routes.ts`, `src/schemas/candidate.schemas.ts`, plus their tests. **This branch has none of these files at all** — that's the headline of Step 2.

---

## Step 2 — CRITICAL: ownership/serializer duplication check

**Searched for:** any import of `ownershipGuard`, `isOwner` (from `src/lib/ownership.ts`) or `isInternalRole`, `serializeApplicationNote(s)`, `serializeAIScreening(s)` (from `src/lib/serializers.ts`) anywhere in this branch's new code.

**Result: zero matches.** Not because she wrote a competing/disagreeing version — because **`src/lib/ownership.ts` and `src/lib/serializers.ts` don't exist on this branch at all.** They were added in PR #8, which this branch never merged from. So this isn't "two ownership helpers that disagree" — it's **no ownership enforcement anywhere in this branch's new code**, full stop.

Confirmed by grepping every new route file — **none** of the 6 new route files (`candidate-profiles.routes.ts`, `applications.routes.ts`, `jobs.routes.ts`, `company.routes.ts`, `skills.routes.ts`, `job-skills.routes.ts`) import `authenticate` or `authorize` either. The only middleware used anywhere is `validate()`. Every single new endpoint in this PR is reachable **without logging in, as any role, for any resource.**

Concretely, right now, an anonymous `curl` can:
- `POST /api/candidate-profiles` with an arbitrary `userId` in the body → create a profile for *any* user, no auth token needed.
- `GET /api/candidate-profiles` → list every candidate's headline/bio/phone/location/resumeUrl.
- `GET /api/applications/job/:jobId` → list every applicant to a job, including each candidate's name, email, cover letter, and resume URL (via the nested `CandidateProfile`/`User` include).
- `PATCH /api/applications/:id/stage` → move any application to any stage (including `HIRED`/`REJECTED`).
- `POST /api/applications/:id/assign-interviewer` → assign any interviewer to any application.
- `POST /api/jobs` with an arbitrary `createdById` → create a job attributed to any user.
- `POST /api/companies` / `PUT /api/companies/:id` → create or rewrite any company's profile.

This is the single most important thing in this audit. It is **not a merge-conflict problem** — merging cleanly wouldn't fix it, because there's no conflict on these files. It needs to be fixed as its own follow-up work regardless of how the routes/index.ts conflict is resolved (see Step 8).

---

## Step 3 — Inventory: everything this branch adds

All of it is additive (no edits to existing files besides `routes/index.ts` and the two frontend files below).

### Backend — routes → controllers → services → schemas (all new files)

| Resource | Route file | Endpoints | Controller | Service | Schema | Auth chain |
|---|---|---|---|---|---|---|
| Company | `company.routes.ts` | `POST /`, `PUT /:id` | `company.controller.ts` | `company.service.ts` | `company.schemas.ts` | **none** |
| Jobs | `jobs.routes.ts` | `POST /` only (no list/get) | `jobs.controllers.ts` | `jobs.service.ts` | `jobs.schemas.ts` | **none** |
| Skills | `skills.routes.ts` | `POST /` only | `skills.controllers.ts` | `skills.service.ts` | `skills.schemas.ts` | **none** |
| Job-Skills | `job-skills.routes.ts` | `POST /:jobId/skills` | `job-skills.controllers.ts` | `job-skills.service.ts` | `job-skills.schemas.ts` | **none** |
| Candidate profiles | `candidate-profiles.routes.ts` | `POST /`, `GET /`, `GET /:id` | `candidate-profiles.controllers.ts` | `candidate-profiles.service.ts` | `candidate-profiles.schemas.ts` | **none** |
| Applications | `applications.routes.ts` | `POST /`, `GET /job/:jobId`, `PATCH /:id/stage`, `POST /:id/assign-interviewer` | `applications.controllers.ts` | `applications.service.ts` | `applications.schemas.ts` | **none** |

No new models, no new migrations, no new npm dependencies (confirmed via `git diff origin/main...HEAD -- packages/shared/ packages/api/src/models/ package.json package-lock.json` — all empty).

### Frontend

| File | What it does |
|---|---|
| `packages/web/src/pages/recruiter/RecruiterCandidatesPage.tsx` (new) | Lists all candidates from `GET /api/candidate-profiles` |
| `packages/web/src/pages/recruiter/RecruiterCandidateDetailsPage.tsx` (new) | Shows one candidate from `GET /api/candidate-profiles/:id` |
| `packages/web/src/pages/recruiter/RecruiterPipelinePage.tsx` (modified) | Adds a "Real Applications" section alongside the **still-present mock pipeline UI** — fetches `GET /api/applications/job/:jobId`, has buttons to PATCH stage and assign an interviewer |
| `packages/web/src/routes/index.tsx` (modified) | Registers `/recruiter/candidates` and `/recruiter/candidates/:id`, both behind `<ProtectedRoute allowedRoles={["recruiter"]}>` |

Notable specifics:
- All three data-fetching call sites use **raw `fetch("http://localhost:3000/api/...")`** with a hardcoded absolute URL, bypassing both the shared `apiClient` (axios instance with the `/api` proxy + `withCredentials: true` + 401-refresh interceptor) and the Vite dev proxy. Even if `authenticate` gets added to the backend, these calls send no cookies (`fetch` doesn't include credentials by default), so they'd start failing with 401s the moment the backend is secured — this frontend needs rework alongside the backend fix, not after it.
- `RecruiterPipelinePage.tsx` has a **hardcoded job id** (`648dd3a8-2a68-4d16-a734-a59ce8d8b6ee`) and a **hardcoded interviewer id** (`340343ce-ca26-4172-bc0f-7047a9a79bc8`) baked into the fetch calls, and uses `alert()` for feedback instead of the kit's toast/error patterns. Reads as prototype-stage, not integration-ready.
- The frontend route guard (`allowedRoles={["recruiter"]}`) only stops navigation *inside the React app*. Since the API endpoints behind these pages have no server-side auth (Step 2), anyone can hit them directly regardless of what the frontend does.
- No `GET /api/jobs` or `GET /api/jobs/:id` exists on this branch, so there's currently no way for a candidate (or this recruiter UI) to list/browse jobs — only `POST /api/jobs` (create) exists.

### Tests

**None.** No new test files for any of the 6 new resources, front or back end. The only tests that exist and pass are the pre-existing auth suites (Step 7).

---

## Step 4 — Shared-model / migration collisions

**None found.**

```
git diff origin/main...HEAD --stat -- packages/shared/          → empty
git diff origin/main...HEAD --stat -- packages/api/src/models/  → empty
diff <(git ls-tree -r --name-only origin/main -- packages/api/src/migrations/) \
     <(git ls-tree -r --name-only HEAD       -- packages/api/src/migrations/)  → empty
```

This branch touches **no** Sequelize model, **no** migration, and **no** file under `packages/shared/` at all — not `User`, not the role types, not `authorize.ts`, not `models/index.ts`. It reuses the tables from the already-merged domain-data-model commit (`9a35890`) as-is. This is good news for the merge itself: there is no schema drift and no risk of two migrations fighting over the same table. The entire risk surface is at the routes/controllers/services layer (Steps 1–3), not the data layer.

---

## Step 5 — Convention adherence

| Convention | Status |
|---|---|
| Sequelize class-based models | N/A — no new models added |
| VARCHAR + CHECK, not Postgres ENUM | N/A — no new columns/enums added; existing `stage` enum values used correctly (`updateApplicationStageSchema` restricts to `REVIEWED/INTERVIEWING/OFFER/HIRED/REJECTED`, all valid members of the shared `APPLICATION_STAGES` list — this part is correct) |
| `{ data: ... }` response envelope | **Followed consistently** in every controller |
| `routes → controllers → services`, Zod in `schemas/` | **Followed** at the file-layout level |
| File naming | **Inconsistent.** Existing convention is singular (`auth.controller.ts`, `candidate.controller.ts`, `candidate.schemas.ts` — wait, that one's plural too; net convention is mixed but leans singular for controllers). This branch uses **plural** `*.controllers.ts` for 5 of 6 resources but **singular** `company.controller.ts` for the 6th — inconsistent even within itself. |
| `authenticate → authorize → ownership` chain | **Missing everywhere** — see Step 2 |
| Client-supplied ownership fields | `createCandidateProfileSchema` requires `userId` in the body; `createJobSchema` requires `createdById` in the body. Both should be derived from `req.user.userId` (set by `authenticate`), never taken from client input — this is the same root cause as Step 2, just visible at the schema layer too. |
| Error handling | Mostly uses `createError()` correctly (404s for missing job/company/profile/interviewer, 400 for duplicate application, 400 for wrong-role interviewer assignment). **Gap:** unique-constraint violations aren't pre-checked or translated — e.g. `skillService.create()` doesn't check for an existing skill name before insert, and `candidateProfileService.create()` doesn't check for an existing profile per user before insert; both rely on the DB's `unique: true` constraint, so a duplicate currently surfaces as a raw, uncaught 500 rather than a clean 409. |
| Debug leftovers | `console.log("ID =", id)` left in `candidate-profiles.service.ts:38` (also the one ESLint warning — see Step 7) |
| Formatting | Noticeably inconsistent indentation/line-breaking within and across the new files (e.g. `candidate-profiles.controllers.ts` mixes 2-space-indented and flush-left method bodies in the same object literal). Cosmetic, but worth a pass before merge. |

---

## Step 6 — The committed PDF files

**I could not find them — reporting this as a discrepancy, not a confirmation.**

Searched exhaustively:
```
git log --all --diff-filter=A --name-only -- "*.pdf"                 → no output
git log --all --diff-filter=A --name-only -- "*uploads*"              → no output (no uploads/ dir ever tracked, on any branch)
git log --all --diff-filter=A --name-only \
  | grep -E "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"  → no output
```
I also checked for Git LFS (`.gitattributes` doesn't exist — no LFS pointers to account for) and listed **every** non-source-code file ever added in the repo's history (`git log --all --diff-filter=A --name-only`, filtered down to non-`.ts/.tsx/.js/...` extensions). The only binaries anywhere in history are the three pre-existing `screen-mockups/*.png` files and two unrelated `dev.db` SQLite files under `packages/api` and `packages/workers` — nothing UUID-named, nothing PDF, on this branch or any other.

I confirmed `origin/feat/domain-models` (`git ls-remote`) matches what I audited exactly, so this isn't a stale-fetch issue.

**Possible explanations, none of which I can confirm from here:** the GitHub PR "Files changed" view was showing a different comparison base than expected, the observation was made against a different fork/remote, or it's a mix-up with a local (gitignored, untracked) `packages/api/uploads/` directory that resume-upload testing produces on disk but never commits (this is exactly what PR #8's `.gitignore` entry — `packages/api/uploads/` — is for, though note that entry itself doesn't exist on `feat/domain-models`, since this branch predates PR #8).

**Recommendation:** before doing anything else about this, re-confirm directly on GitHub's PR #9 "Files changed" tab which commit/path the PDFs actually show under, since I cannot locate them via git.

---

## Step 7 — Does it build/lint/test

Run against `feat/domain-models` as-is (`3434800`), no merge in progress. No special migration/env setup needed beyond what's already documented (docker compose postgres + existing migrate/seed) — this branch adds no new migrations or dependencies.

| Package | Build | Lint | Test |
|---|---|---|---|
| `packages/shared` | ✅ pass | — | — |
| `packages/api` | ❌ **FAIL** (2 errors) | ⚠️ pass, 1 warning | ✅ pass (21/21 — only pre-existing auth suites; nothing tests the new code) |
| `packages/web` | ✅ pass | ✅ pass | ✅ pass (5/5 — only pre-existing suites; nothing tests the new recruiter pages) |

**`packages/api` build errors (`tsc`):**
```
src/controllers/candidate-profiles.controllers.ts(53,9): error TS2345:
  Argument of type 'string | string[]' is not assignable to parameter of type 'string'.
src/controllers/company.controller.ts(26,7): error TS2345:
  Argument of type 'string | string[]' is not assignable to parameter of type 'string'.
```
Both are the same root cause: `req.params.id` is typed `string | string[]` under this repo's Express types and gets passed straight into a `(id: string)` service method without a cast — the exact same issue I hit and fixed with `req.params.id as string` while building the candidate-profile ownership guard on PR #8. **The package does not currently compile.**

**`packages/api` lint warning:**
```
src/services/candidate-profiles.service.ts:38  warning  Unexpected console statement  no-console
```
(the `console.log("ID =", id)` noted in Step 5.)

---

## Step 8 — Prioritized resolution brief

Ranked by what blocks the merge vs. what's a security debt to schedule separately. **Nothing below has been executed — this is the shared checklist.**

1. **[Blocking · Security] No auth on any new endpoint.** Every route in Step 3's table needs `authenticate` at minimum; most also need `authorize(...)` (e.g. `RECRUITER`/`ADMIN` for company/job/application-management endpoints) and an ownership check via the **existing** `ownershipGuard`/`isOwner` from `src/lib/ownership.ts` (now available once merged with main) — e.g. a recruiter should only manage jobs/applications for their own company. **Recommended approach:** do this as a dedicated follow-up PR immediately after this one merges, resource by resource, reusing `ownershipGuard` exactly as PR #8 did for candidate routes — not as part of resolving the text conflict.

2. **[Blocking · Security] Client-supplied identity fields.** `userId` on candidate-profile create and `createdById` on job create must come from `req.user.userId` (post-`authenticate`), not the request body. Same PR as #1.

3. **[Blocking · Duplication] Two candidate-profile APIs.** `/api/candidate-profiles` (this branch, unauthenticated) and `/api/candidate` (main, PR #8, RBAC-secured) are two implementations of the same feature. **Recommended approach:** retire `/api/candidate-profiles` entirely and point `RecruiterCandidatesPage`/`RecruiterCandidateDetailsPage` at a new **recruiter-facing read endpoint** built on the secured candidate-profile data (recruiters need to *list/browse* candidates, which PR #8's candidate-scoped `/api/candidate/profile` intentionally doesn't do) — don't just delete one side without checking whether recruiters need a genuinely different endpoint than candidates do.

4. **[Blocking · Build] Two TypeScript compile errors.** `req.params.id as string` in `candidate-profiles.controllers.ts:53` and `company.controller.ts:26`. Two-line fix, but the package doesn't compile without it.

5. **[Blocking · Merge mechanics] `routes/index.ts` conflict.** Combine both sides' imports and `router.use()` calls (Step 1). Trivial once #3 decides whether `candidate-profiles.routes` survives in its current form.

6. **[Needs a decision, not code] The ~12 PDF files.** I could not locate them anywhere in git history on any branch (Step 6). Before anyone spends time on git-history cleanup, confirm on GitHub exactly which commit/path the PR view is showing them under — it's possible this is a false alarm or a different branch/fork.

7. **[High, not blocking] Frontend uses raw `fetch()` to a hardcoded `localhost:3000`, no credentials.** Once #1 lands, these calls will start failing (no cookies sent). Rework the 3 recruiter pages to use `apiClient` (proxy + cookies + 401 refresh) at the same time as the backend auth work, not after.

8. **[Medium] Hardcoded job id / interviewer id in `RecruiterPipelinePage.tsx`**, `alert()` for feedback, and the old mock pipeline UI still rendered alongside the new real-data section. Needs a cleanup pass regardless of merge order.

9. **[Medium] No tests.** Zero coverage for ~1,080 lines of new backend + frontend code. At minimum, mirror PR #8's pattern: integration tests per resource once auth is added (auth is what makes the tests meaningful — testing an open endpoint doesn't prove much).

10. **[Low] Convention cleanup.** Standardize `*.controller.ts` vs `*.controllers.ts` naming; remove the `console.log` in `candidate-profiles.service.ts:38`; add pre-insert duplicate checks (candidate profile per user, skill name) so unique-constraint violations return clean 409s instead of raw 500s; run a formatting pass (Prettier) over the new files.

**Suggested merge order:** 4 (compile fix) → 6 (confirm/resolve the PDF question) → 3 (decide the candidate-profile duplication) → 1+2+7 together (auth + ownership + frontend rework, since they're one coherent change) → 5 (trivial conflict resolve, now that #3 is decided) → 8, 9, 10 as follow-up polish.
