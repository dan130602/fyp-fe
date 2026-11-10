# ClearCall — Compliance Review Frontend

React + Vite frontend for the ClearCall compliance review tool. Compliance officers
review call transcripts against a checklist; internal developers review pipeline
evaluation runs; managers see reporting. Roles decide which of those you get.

## Stack

React 19 · Vite 8 · React Router 7 · AWS Cognito · TypeScript (strict, `src/auth/`)
· Vitest · Biome

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Cognito config is required: fill in the pool ID, client ID and region in `.env.local`
(see `.env.example` for where to find each in the AWS console). The app fails loudly
at startup if any is missing.

Requires Node 20+.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Production build |
| `npm run test` | Run the test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome lint + format check |
| `npm run lint:fix` | Apply safe fixes |

A husky pre-commit hook formats staged files, then runs `typecheck` and `test`.
Lint findings do not block a commit; type errors and failing tests do.

## Auth

**Cognito authenticates; the backend authorizes.** Sign-in is AWS Cognito (SRP,
custom form — not the Hosted UI), which yields a signed JWT proving identity. The
role comes from `GET /api/users/me`, which reads `t_user.role` in the backend's
database. Cognito groups are not used.

| Role | Lands on |
|---|---|
| `COMPLIANCE_OFFICER` | `/review` |
| `ADMIN` | `/management` |

The ID token (not the access token) is sent as the bearer, because the backend
needs its `email`/`name` claims to provision a user on first sign-in.

Tokens live in `sessionStorage`, so closing the tab signs you out.

`require-role.tsx` is a UI affordance and can be bypassed in the browser — real
enforcement is `@PreAuthorize` on the backend, which checks the database role on
every request.

Requires the backend (`fyp-be/media-processing-service`) running on :8080. Its
`AWS_COGNITO_APP_CLIENT_ID` must include this app's client ID, and its
`CORS_ALLOWED_ORIGINS` must include `http://localhost:5173`.

## Layout

```
src/
  auth/          Cognito, roles, route guard (TypeScript, strict)
    __tests__/
  components/    compliance/ · developer/ · shared/
  views/         one per role, plus login
  data/          mock data behind hooks
  lib/           logger, formatting, metrics
```

Logging goes through `src/lib/logger.ts`. Gate `debug`/`info` calls with a
module-local `DEV &&` so the strings are stripped from production builds — the gate
has to stay at the call site to be strippable.

## Production observability

Open **Developer > Production** (`/developer?tab=production`) for a live,
read-only view of saved AI outcomes and officer decisions. It uses the existing
authenticated `/api/observability?days=7` endpoint contract and refreshes every
minute. Deploy the matching backend reporting endpoint; this feature adds no
migration and does not change the officer or management workflow.

Configure the API URL and public Cognito SPA settings in ignored `.env.local`.
Sign in and open the developer page in the same tab and origin (the current
app uses tab-scoped storage). Reporting requires DEVELOPER, ADMIN, SUPER_ADMIN or MANAGER.
Developer accounts land directly on Production after sign-in. The panel sign-in
link returns reporting accounts to this dashboard, and Sign out returns to `/login`.
Backend failures show an unavailable state, never a sample-data fallback.

The source is the existing `t_langgraph_output`, `t_checklist` and
`t_checklist_decision` records. In a finalized review, the latest officer
override is the reference; an unchanged answer means the saved AI verdict was
accepted. Unreviewed calls, reviews predating a newer output, conflicting AI
snapshots and ambiguous decision ordering are excluded from FP/FN.

Breach (FAIL) is positive: AI FAIL / officer PASS is FP, AI PASS / officer FAIL
is FN. Accepted FAIL/PASS results contribute TP/TN only after final review.
The dashboard retains original decision UUIDs; repeated edits and reverts do
not inflate current totals. This is an officer-approved production reference,
not an independent benchmark ground truth.

The activity window includes calls analysed or reviewed during the window.
Costs and timing cover the latest saved results in that cohort, including older
calls reviewed recently. They are not a complete billing ledger: the existing
schema overwrites earlier AI runs. Missing telemetry remains unavailable and
no latency is inferred from database timestamps. No Langfuse setup is needed.
See `fyp-be/docs/production-observability.md` for deployment and access details.
