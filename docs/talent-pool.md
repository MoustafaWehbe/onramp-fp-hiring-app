# Talent pool / CRM

Phase 10 adds a company-private CRM layer over standing candidate profiles.
A candidate appears only after submitting a real application to one of the
company's jobs. Pool membership, notes, and tags never appear on candidate
routes.

## Data model

| Table | Purpose | Delete behavior |
|---|---|---|
| candidate_pool_entries | One optional company/candidate shortlist row with a private note | Unique on (company_id, candidate_id); cascades when the company or candidate profile is deleted |
| candidate_tags | Company-owned custom vocabulary | Cascades with the company |
| candidate_pool_tags | Pool-entry/tag join | Cascades from either side |

added_by is nullable and uses SET NULL, so removing a recruiter account does
not destroy the company's pool history. Removing a candidate profile cascades
its entry; the recruiter list therefore degrades to the candidate simply no
longer appearing rather than failing on an orphan.

Invitations extend notifications with the invite_to_apply type and a nullable
related_job_id. They use the existing notification service and SSE fan-out.
No application row is created.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | /recruiter/candidates | Company-wide prior candidates; filters by search, tag, skill, fit range, scorecard range, and pool status |
| GET | /recruiter/candidates/:candidateId | Company-scoped profile, full application history, pool state, fit and scorecard summaries |
| GET/POST | /recruiter/tags | List/create company tags |
| DELETE | /recruiter/tags/:tagId | Delete a company tag and cascade its join rows |
| POST/PATCH/DELETE | /recruiter/candidates/:candidateId/pool | Add, edit, or remove pool membership |
| POST | /recruiter/candidates/:candidateId/invite | Notify a candidate about a company-owned open job |

All routes require RECRUITER or ADMIN and resolve the caller's company from
the authenticated user. An unknown or other-company job/tag is returned as
404. A candidate with no prior submitted company application is rejected with
422. A job that closed after the selector loaded is rejected with 409 and
"This job is no longer open".

## Verification / PR notes

Automated checks:

- talent-pool.routes.test.ts: 8 database-backed integration tests covering
  company-wide history, skill/fit/scorecard/tag filters, duplicate add
  idempotence, tag cascade, never-applied rejection, other-company isolation,
  closed-job rejection, persisted notification creation, realtime recipient,
  unchanged application count, and graceful candidate-account deletion.
- Talent-pool integration plus notifications, scorecards, and recruiter
  workspace: 55 tests passed.
- Full API suite: 314 tests passed across 24 suites (run with forceExit because
  the pre-existing queue tests leave a Redis handle open after completion).
- Full web suite: 240 tests passed across 46 files.

Direct seeded-data verification used
recruiter@northwindlabs.example.com and amara.okafor@example.com with
Password123!:

- Northwind list returned all 4 submitted candidates across its jobs.
- Amara's company history returned 1 submitted application.
- Created and persisted "Phase 10 verified", attached it to Amara with the
  note "Verified against the seeded Northwind recruiter account.", and the
  tag filter returned only Amara.
- Invited Amara to the different open Platform Engineer job. Her notification
  list contained a real invite_to_apply row linked to that job, while her
  application-history count stayed unchanged.
- Inviting her to the seeded closed Frontend Developer job returned 409 with
  "This job is no longer open".

The seed contains neither a never-applied standing profile nor a second
company/recruiter. Those two acceptance cases are therefore covered by the
real-Postgres integration fixture rather than claimed as seeded-account
checks.

## Expected phase 9 merge touchpoint

This branch is based on feature/interview-scorecards. It adds the
TalentPoolSection and application-history summary to
RecruiterCandidateDetailsPage.tsx, alongside phase 9's scorecard section.
If the branches are replayed independently, that page is the expected small
content-order conflict; the scorecard panel and talent-pool section are
independent and both should be retained.
