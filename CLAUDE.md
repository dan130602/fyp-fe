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
DEV && log.debug("Resolved role", role);
```

**The gate has to stay at the call site.** Moving it inside `createLogger` looks
tidier and silently stops the stripping — the strings then ship in the production
bundle. Verify with a grep of `dist/assets/*.js` after changing anything here.

Never log tokens, passwords, or decoded token payloads. Usernames, roles, group
names and expiry timestamps are fine.

## Auth

- Roles come from `cognito:groups`, which is an **array** and may be absent.
  `resolveRole` picks one by explicit priority and returns `null` when nothing
  matches — an unassigned user must fail login, never land on a default screen.
- `NotAuthorizedException` and `UserNotFoundException` must keep producing the
  **same** message. Splitting them turns the login form into a user-enumeration
  oracle. There is a test pinning this.
- `login` is async; `logout` must stay synchronous (it is passed straight to an
  onClick).
- The `loading` state in `AuthProvider` exists because session rehydration is
  async. Without the guards in `require-role.tsx` and `app.jsx`, a refresh bounces
  authenticated users to `/login`.

## Tests

`npm run test` — Vitest, in `src/auth/__tests__/`. Pure logic first; rendering
tests only where behaviour is non-obvious. Tests are pinned to
`VITE_AUTH_MODE=dummy` so they behave the same locally and in CI.

If a test fails after a change, that is a finding about the code. Do not adjust the
test to match.

## Out of bounds

Do not modify without being asked: `src/lib/format.js`, `src/lib/metrics.js`, or
anything under `src/components/developer/`.

## Style

Comments are one line. State the fact, not the reasoning. Keep the ones that
document traps (the silent-hang callback, the enumeration guarantee, the loading
guard) — those record things the code cannot show.

`npm run lint` reports pre-existing a11y and formatting findings in the compliance
and developer components. Leave them unless you are fixing them deliberately; do
not mass-reformat to get a clean run.
