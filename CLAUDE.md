# ClearCall frontend — conventions

See README.md for setup and the auth model. This file covers things that are easy
to get wrong.

## TypeScript

`src/auth/` and `src/lib/logger.ts` are TypeScript under `strict: true`. Everything
else is still `.js`/`.jsx` and unchecked (`checkJs: false`) — that is deliberate,
not an oversight. New auth code is TypeScript; do not migrate other directories
without being asked.

- `verbatimModuleSyntax` is on, so type-only imports must use `import type`.
- Imports use explicit `.ts`/`.tsx`/`.js` extensions. Keep that.
- Derive `Role` from the `ROLES` constant, never restate the union by hand.

## Logging

Use `createLogger(namespace)` from `src/lib/logger.ts`.

Gate `debug` and `info` with a module-local `DEV &&`:

```ts
const DEV = import.meta.env.DEV;
DEV && log.debug("Rehydration starting");
```

**The gate has to stay at the call site.** Moving it inside `createLogger` looks
tidier and silently stops the stripping — the strings then ship in the production
bundle. Verify with a grep of `dist/assets/*.js` after changing anything here.

Never log tokens, passwords, or decoded token payloads. Usernames, roles and expiry
timestamps are fine.

## Auth

**Cognito authenticates; the backend authorizes.** Cognito supplies identity only.
The role comes from `GET /api/users/me` (`t_user.role` in the backend's database).
Cognito groups are not read — do not reintroduce a role derived from the token.

- The **ID token** is the bearer, not the access token: the backend needs its
  `email`/`name` claims to provision a user on first sign-in.
- `getIdToken()` must go through `getSession()`, which refreshes an expired token.
  Caching the token from sign-in works for exactly one hour, then 401s everywhere.
- `logout()` must call `queryClient.clear()`. Without it the next user on this
  browser inherits the previous user's cached `/me` — their name, role and landing
  route. There is a test pinning this.
- `NotAuthorizedException` and `UserNotFoundException` must keep producing the
  **same** message. Splitting them turns the login form into a user-enumeration
  oracle. There is a test pinning this.
- `login` is async; `logout` must stay synchronous (it is passed straight to an
  onClick).
- The `loading` state in `AuthProvider` covers Cognito rehydration *and* `/me`.
  Without the guards in `require-role.tsx` and `app.jsx`, a refresh bounces
  authenticated users to `/login`.
- `/me` **401** means the backend rejects the session — sign out. A **network
  error or 5xx** must not sign anyone out; a backend restart should not log
  everyone out.

`ROLES` values must match the backend's `Role` enum exactly (`ADMIN`,
`COMPLIANCE_OFFICER`). Backend `MANAGER` folds into `ADMIN` in `roleFromBackend`.

Requires the backend on :8080, with this app's Cognito client ID in its
`AWS_COGNITO_APP_CLIENT_ID` and `http://localhost:5173` in `CORS_ALLOWED_ORIGINS`.

## Tests

`npm run test` — Vitest, in `src/auth/__tests__/`. Pure logic first; rendering
tests only where behaviour is non-obvious.

If a test fails after a change, that is a finding about the code. Do not adjust the
test to match.

## Out of bounds

Do not modify without being asked: `src/lib/format.js`, `src/lib/metrics.js`, or
anything under `src/components/developer/`.

## Style

Comments are one line. State the fact, not the reasoning. Keep the ones that
document traps (the silent-hang `newPasswordRequired` callback, the enumeration
guarantee, the loading guard, the logout cache clear) — those record things the
code cannot show.

`npm run lint` reports pre-existing a11y and formatting findings in the compliance
and developer components. Leave them unless you are fixing them deliberately; do
not mass-reformat to get a clean run.
