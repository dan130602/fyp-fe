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

`.env.local` defaults to `VITE_AUTH_MODE=dummy`, which runs the prototype login with
hardcoded users — no AWS needed. To use real Cognito, set `VITE_AUTH_MODE=cognito`
and fill in the pool ID, client ID and region (see `.env.example` for where to find
each in the AWS console).

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

Authentication is AWS Cognito (SRP, custom login form — not the Hosted UI).
Roles come from **Cognito Groups**, read off the `cognito:groups` claim in the ID
token. Group names match the values in `src/auth/roles.ts` exactly:

| Group | Lands on |
|---|---|
| `compliance-officer` | `/review` |
| `internal-developer` | `/developer` |
| `compliance-manager` | `/management` |

Groups rather than a `custom:role` attribute, because a user can rewrite their own
attributes via the Cognito API with just their access token — group membership needs
IAM credentials a browser never has.

Tokens live in `sessionStorage`, so closing the tab signs you out.

`VITE_AUTH_MODE=dummy` swaps Cognito for `src/auth/dummy-users.ts` and shows the demo
credentials on the login screen. That branch is temporary scaffolding.

### Not enforced yet

There is no backend. `require-role.tsx` decides which screens render, but it is a UI
affordance — it can be bypassed in the browser. Cognito gives trustworthy *identity*,
not authorization. Verdicts currently live only in React state, so nothing is at risk
today; once they persist, the `cognito:groups` check has to move server-side.

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
