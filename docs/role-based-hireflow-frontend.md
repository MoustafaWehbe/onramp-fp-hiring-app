# Hireflow Role-Based Frontend Flow

## Overview

This document summarizes the frontend product-flow work completed on the
`feature/lovable-responsive-ui` branch for the Hireflow application.

The goal of this iteration was to improve the user journey before connecting
all backend endpoints. The app now gives users a clear entry path based on
their role:

- Candidate
- Recruiter
- Interviewer

Each role has a dedicated navigation structure, home experience, and mock-data
driven pages.

## Branch

Current frontend branch:

```text
feature/lovable-responsive-ui
```

No merge to `main` was performed.

## Important Repo State

Before this frontend work, the repository already had unrelated dirty backend
and shared files from the earlier authentication/debugging work.

These were intentionally not included in the frontend role-flow changes:

```text
packages/api/package.json
packages/api/prisma/schema.prisma
packages/api/src/controllers/auth.controller.ts
packages/api/src/routes/auth.routes.ts
packages/api/src/services/auth.service.ts
packages/shared/auth/jwt.ts
package-lock.json
```

There was also an odd untracked root file:

```text
ponsive Hireflow frontend design...
```

That file was not modified.

## What Was Implemented

### Public Experience

The root route `/` now serves as a public Hireflow homepage.

It includes:

- Hireflow branding
- Short product introduction
- Role selection cards
- Sign in CTA
- Register CTA
- Explanation of how users enter the platform

The role cards are now larger, balanced, equal-height, and responsive.

### Role Selection

Users can enter the app as:

- Candidate
- Recruiter
- Interviewer

Role selection currently uses a frontend mock session so the product flow can
be tested before backend role endpoints are connected.

The mock role system is isolated in frontend data and auth state so it can be
replaced later by `/api/auth/me`.

### Candidate Experience

Candidate navigation:

```text
Home
Jobs
My applications
Profile
Logout
```

Candidate routes:

```text
/candidate
/jobs
/applications
/profile
```

Candidate pages include:

- Recommended jobs
- Application status summary
- Profile completion card
- CTA to browse jobs
- CV-style profile page with name, email, role, skills, experience, and summary

### Recruiter Experience

Recruiter navigation:

```text
Dashboard
Pipeline
Jobs
Logout
```

Recruiter routes:

```text
/recruiter/dashboard
/recruiter/pipeline
/recruiter/jobs
```

Recruiter pages include:

- Active jobs
- Candidates in pipeline
- Interviews scheduled
- Recent applicants
- Hiring funnel summary
- Candidate pipeline list
- Recruiter job list with applicant counts

### Interviewer Experience

Interviewer navigation:

```text
Home
Pipeline
Schedule
Logout
```

Interviewer routes:

```text
/interviewer
/interviewer/pipeline
/interviewer/schedule
```

Interviewer pages include:

- Upcoming interviews
- Feedback pending
- Assigned candidates
- Interviewer pipeline
- Interview schedule cards
- Feedback CTAs

## Header Behavior

The header now adapts based on the current user role.

Logged out users see:

```text
Home
Jobs
Sign in
```

Candidate users see:

```text
Home
Jobs
My applications
Profile
Logout
```

Recruiter users see:

```text
Dashboard
Pipeline
Jobs
Logout
```

Interviewer users see:

```text
Home
Pipeline
Schedule
Logout
```

The mobile header uses a hamburger menu and exposes all role-specific links.

## Logout Behavior

Logout uses the existing auth path when available.

It also includes a safe frontend fallback that:

- Clears the mock frontend role session
- Clears local storage auth placeholders
- Clears the current user state
- Allows redirecting back to `/`

This keeps the frontend usable now without blocking future backend integration.

## Mock Data Added

Mock data was organized under:

```text
packages/web/src/data/
```

Files added:

```text
applications.ts
interviews.ts
pipeline.ts
users.ts
```

Existing job mock data remains in:

```text
jobs.ts
```

## Types Added

Frontend TypeScript types were organized under:

```text
packages/web/src/types/
```

Files added:

```text
applications.ts
interviews.ts
pipeline.ts
users.ts
```

## Key Components Updated

```text
packages/web/src/components/jobs/RoleSwitcher.tsx
packages/web/src/components/layout/Header.tsx
packages/web/src/providers/AuthProvider.tsx
packages/web/src/routes/index.tsx
```

## Key Pages Added

```text
packages/web/src/pages/HomePage.tsx
packages/web/src/pages/candidate/CandidateHomePage.tsx
packages/web/src/pages/recruiter/RecruiterDashboardPage.tsx
packages/web/src/pages/recruiter/RecruiterPipelinePage.tsx
packages/web/src/pages/recruiter/RecruiterJobsPage.tsx
packages/web/src/pages/interviewer/InterviewerHomePage.tsx
packages/web/src/pages/interviewer/InterviewerPipelinePage.tsx
packages/web/src/pages/interviewer/InterviewerSchedulePage.tsx
```

## Updated Pages

```text
packages/web/src/pages/applications/ApplicationsPage.tsx
packages/web/src/pages/auth/Login.tsx
packages/web/src/pages/jobs/JobsPage.tsx
packages/web/src/pages/profile/ProfilePage.tsx
```

## Verification

The following commands were run from `packages/web`:

```bash
npm run lint
npm run build
```

Both passed.

The following Vite routes were manually checked and returned `200`:

```text
/
/jobs
/candidate
/applications
/profile
/recruiter/dashboard
/recruiter/pipeline
/recruiter/jobs
/interviewer
/interviewer/pipeline
/interviewer/schedule
```

## Remaining Notes

- Backend endpoints are not connected yet.
- The role system is currently mock-driven on the frontend.
- Backend role integration should replace the mock session with data from
  `/api/auth/me`.
- ESLint prints a warning about the shared ESLint config package not declaring
  `"type": "module"`. Shared package metadata was not changed in this frontend
  task.

## Suggested Commit Message

```text
feat(web): add role-based Hireflow navigation and home pages
```

## Recommended Next Branch

```text
feature/connect-role-based-auth
```

Recommended next step:

Connect backend authentication and `/api/auth/me` so real users land on the
correct role-specific experience after login.
