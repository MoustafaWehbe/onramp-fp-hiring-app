# Interview scorecards

Structured evaluation on top of the phase 3 interview module. `interview_date`
and `recruiter_notes` are untouched and still hold general notes; scorecards
are the separate, comparable layer.

A recruiter defines criteria once per company, each interviewer scores a
candidate against them 1-5, and the candidate view rolls those up into
per-criterion and overall averages while keeping every individual submission
readable.

## Data model

```
scorecard_templates ──< scorecard_criteria
        │                        │
        │                        │ (RESTRICT)
        ˅                        ˅
interview_scorecards ────────< scorecard_ratings
        │
        └── unique (application_id, interviewer_id)
```

| Table | Holds |
|-------|-------|
| `scorecard_templates` | A named set of criteria, owned by a company |
| `scorecard_criteria` | One criterion, ordered by `sort_order` |
| `interview_scorecards` | One interviewer's evaluation of one application |
| `scorecard_ratings` | One 1-5 rating (+ optional comment) per criterion |

Two unique indexes carry most of the correctness:

- **`(application_id, interviewer_id)`** makes "one scorecard per interviewer"
  a property of the data rather than a convention. It is why resubmitting is
  an update, and why a double submit cannot count twice in an average.
- **`(scorecard_id, criterion_id)`** stops one criterion being scored twice
  inside a single scorecard, which would silently weight it double.

`rating BETWEEN 1 AND 5` is a CHECK constraint, not just validation: an
average is only meaningful if every value feeding it is in range.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/scorecard-templates` | Company's templates + a suggested starter set |
| `POST` | `/scorecard-templates` | Create |
| `PUT` | `/scorecard-templates/:id` | Replace title and criteria list |
| `DELETE` | `/scorecard-templates/:id` | Delete (refused once scored against) |
| `PUT` | `/applications/:id/scorecard` | Upsert the caller's own scorecard |
| `GET` | `/applications/:id/scorecards` | Individual submissions + averages |

Everything is company-scoped through the same `ownershipGuard` every prior
phase uses. Scorecard routes reuse `ownApplicationGuard`, so ownership runs
through the application's job to the caller's company — a recruiter elsewhere
gets the same 404 they would get for any application they cannot see, never a
403 that would confirm the id exists.

`PUT` rather than `POST` for submission because the caller can only ever
address one resource: their scorecard for this application.

## The no-template-configured decision

**A company with no template gets an explicit empty state. No template is
auto-created.**

`GET /scorecard-templates` returns `{ templates: [], starterCriteria: [...] }`.
The frontend renders guidance and a **Start from the suggested set** button
that prefills the create form with Technical / Communication / Culture fit —
which the recruiter then submits themselves.

The alternative, materialising a default template on first read, was rejected
on a technical point rather than a stylistic one: `scorecard_ratings.criterion_id`
is a foreign key, so any template that can actually be scored against has to
be real rows. Auto-creating would therefore turn a GET into a write, and the
company would own a template nobody created — appearing in the template list,
editable and deletable, indistinguishable from a deliberate one. Suggesting
the same three criteria and letting a person press the button costs one click
and keeps every row in the table something someone chose.

## How averages are computed

- **Per criterion**: mean of every rating given against that criterion,
  across all submissions.
- **Overall**: mean of every rating on the application. With all interviewers
  scoring all criteria — the normal case — this equals the mean of the
  per-criterion averages. They diverge only when someone leaves a criterion
  blank, in which case that person simply contributes fewer values.
- **Rounding**: two decimals. Past what a 1-5 scale distinguishes, and it
  keeps `4.333333333333333` out of the response.
- **Nobody has scored**: `null`, never `0`. A zero would read as "everyone
  rated them the worst possible" and would drag any further aggregate down.
  Every consumer handles the null.

A criterion left blank is not scored, not scored low — the form sends only
criteria that were given a rating.

Per-criterion averages are grouped by criterion id rather than by the current
template, so a renamed criterion still reports under the label its ratings
were given against, and scorecards submitted against an older template still
appear.

## Protecting submitted history

A template edit reconciles rather than rebuilds: a criterion sent back with
its id keeps that id and therefore keeps its ratings. Two edits are refused:

- **Removing a criterion that has ratings** → 409 naming it
  (*"Cannot remove Culture fit — it has already been scored on submitted
  scorecards. Add new criteria instead."*). Checked before any write, so the
  title does not change either.
- **Deleting a template that has submissions** → 409 with the count.

Adding and reordering are always safe and stay allowed. `ON DELETE RESTRICT`
on `scorecard_ratings.criterion_id` is the database half of the same rule, so
even a direct SQL delete cannot orphan historical scores.

## Frontend

| Screen | What it does |
|--------|--------------|
| `/recruiter/scorecard-templates` | Create, edit, reorder, delete templates |
| Candidate details → *Interview scorecards* | Averages, individual submissions, and the caller's own form |
| Pipeline card | `4.2/5 · 3` badge beside the AI fit score, or "No scorecards" |

The submission form is seeded from the caller's own previous scorecard when
there is one, because the endpoint replaces rather than appends — a blank form
would invite someone to overwrite answers they could not see. Which scorecard
is "theirs" comes from the server as `isMine` rather than the client comparing
user ids.

Individual submissions are collapsed under the averages but one click away: an
average of 3 built from a 5 and a 1 is a very different conversation from two
3s, and hiding that would bury the disagreement worth having.

## Known gap

Scorecards are restricted to `RECRUITER` and `ADMIN`, per the phase scope.
Users holding the `INTERVIEWER` role — including the seeded
`interviewer@northwindlabs.example.com` — cannot submit one, which reads
oddly for a feature called an interview scorecard. Formal interviewer
assignment is explicitly future work; widening this to `INTERVIEWER` is a
one-line change to the route guards when that lands.

## Testing

`tests/integration/scorecards.routes.test.ts` runs the whole feature against a
real database, asserting averages against rows the endpoints actually wrote —
a miscounted resubmission or a double-counted criterion shows up as a wrong
number rather than a passing mock.

Seeded accounts for manual checks (all `Password123!`):

- `recruiter@northwindlabs.example.com` — Rae Cruter
- `recruiter2@northwindlabs.example.com` — Nadia Hiring (added for this phase;
  two recruiters at one company are needed to demonstrate an aggregate)
