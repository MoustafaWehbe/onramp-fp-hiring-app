# Starter Kit

A full-stack TypeScript monorepo with everything pre-configured so you can focus on building features.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express, Sequelize, Zod |
| Background Jobs | BullMQ, Redis |
| Database | PostgreSQL |
| Monorepo | Turborepo |
| Language | TypeScript (everywhere) |

## Project Structure

```
packages/
  web/        → React + Vite frontend (port 5173)
  api/        → Express REST API (port 3000)
  workers/    → BullMQ background job processors
  shared/     → Shared utilities (auth, db models, queue, AI)
```

## Getting Started

### 1. Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL + Redis)

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run database migrations

```bash
npm run db:migrate --workspace=@starter-kit/api
```

To migrate and reset the realistic presentation dataset in one command, see
[Demo data](#demo-data).

### 6. Start development servers

```bash
# Start all packages in parallel
npm run dev

# Or start individually
cd packages/api && npm run dev     # API on :3000
cd packages/web && npm run dev     # Web on :5173
cd packages/workers && npm run dev # Workers
```

## Available Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all packages in watch mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all test suites |
| `npm run lint` | Lint all packages |
| `npm run db:seed:demo` | Migrate and reset the realistic demo dataset |

## Demo data

From the repository root, run:

```bash
npm run db:seed:demo
```

This command runs pending migrations, removes the existing fixed demo
workspace in foreign-key-safe order, recreates it, installs the local logo and
resume fixtures, and validates the result. It is intentionally safe to run
repeatedly: each run restores the same relationships with timestamps shifted
relative to the current date. Unrelated companies and accounts are left alone.
By default it only runs against a loopback database and refuses production or
remote targets before migrations start. Set `DEMO_DATABASE_URL` to use an
isolated local demo database; `ALLOW_DEMO_SEED=1` is the explicit override for
a deliberately verified remote target.

The reset creates five complete companies, 108 varied candidate profiles, 20
jobs, and 336 submitted applications. Northwind Labs is the primary `PRO`
workspace. Its **Senior Full-Stack Engineer** job has exactly 100 applications
across every Kanban stage, while Cedar Health Systems is a populated `FREE`
workspace with one open job for demonstrating plan limits.

Fit scores and AI explanations in this dataset are deterministic synthetic demo
fixtures, not model-generated output. They are seeded directly even when no
`OPENAI_API_KEY` is configured, so charts and sorting remain useful offline.
Four fictional PDF/DOCX sources live under
`packages/api/src/seeders/fixtures/resumes/`; the reset copies them to unique
private storage keys so the authorized CV viewer works without sharing a file
between applications.

### Demo accounts

Every account below uses the password `Demo123!`.

| Account | Role / tier | Best used to demonstrate |
|---------|-------------|--------------------------|
| `recruiter@northwindlabs.example.com` | Recruiter, `PRO` | Full dashboard analytics, the 100-card flagship Kanban, AI fit sorting, talent-pool filters, interview notes, CV viewing, and scorecards |
| `recruiter2@northwindlabs.example.com` | Recruiter, `PRO` | A second named evaluator and the visibly disagreeing multi-reviewer scorecard on Amara Okafor |
| `interviewer@northwindlabs.example.com` | Interviewer, `PRO` | Assigned-candidate dashboard and pipeline context |
| `recruiter@cedarhealth.example.com` | Recruiter, `FREE` | Locked AI/talent-pool/scorecard states, the one-open-job limit, and upgrade UX without an incomplete-profile blocker |
| `amara.okafor@example.com` | Candidate | A complete profile, several applications in different stages, full timelines, a scheduled interview with Meet link, notifications, saved jobs, recommendations, and downloadable CVs |
| `lina.haddad@candidate.example.com` | Candidate | A flagship application at `OFFER` plus realistic cross-company application history |
| `mateo.alvarez@candidate.example.com` | Candidate | A flagship `HIRED` timeline with a real `hired_at` duration |

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
npm run test              # Run all tests
cd packages/api && npm test  # API unit tests (Jest)
cd packages/web && npm test  # Web tests (Vitest)
```

## Docker

The `docker-compose.yml` starts:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`
