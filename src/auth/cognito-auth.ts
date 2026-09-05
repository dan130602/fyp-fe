// Real Cognito auth behind the same interface dummy-users.js/auth-context.jsx speak: sessionStorage-backed tokens, role resolved from cognito:groups.
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type ICognitoStorage,
} from "amazon-cognito-identity-js";
import { createLogger } from "../lib/logger.ts";
import { cognitoConfig } from "./cognito-config.ts";
import { type AuthUser, type LoginResult, ROLES, type Role } from "./roles.ts";

const log = createLogger("auth");

/** Claims read off the ID token payload. amazon-cognito-identity-js types
 *  decodePayload() as `{ [id: string]: any }`; this narrows to what we use. */
interface IdTokenPayload {
  "cognito:username"?: string;
  "cognito:groups"?: unknown;
  name?: string;
  email?: string;
  exp?: number;
}

/** Priority order for picking a single role out of a multi-group user.
 *  Earlier entries win. Only these three groups are recognised — anything
 *  else on the token (future groups, typos, another team's group) is ignored
 *  rather than accidentally granted. */
const ROLE_PRIORITY: Role[] = [ROLES.OFFICER, ROLES.MANAGER, ROLES.DEVELOPER];

/** sessionStorage wrapped to the shape amazon-cognito-identity-js expects
 *  (ICognitoStorage: setItem/getItem/removeItem/clear). Passing this instead
 *  of leaving Storage unset is what keeps tokens out of localStorage. */
const sessionBackedStorage: ICognitoStorage = {
  setItem: (key, value) => sessionStorage.setItem(key, value),
  getItem: (key) => sessionStorage.getItem(key),
  removeItem: (key) => sessionStorage.removeItem(key),
  clear: () => sessionStorage.clear(),
};

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId ?? "",
  ClientId: cognitoConfig.clientId ?? "",
  Storage: sessionBackedStorage,
});

/** Builds a CognitoUser tied to the same sessionStorage-backed storage as the
 *  pool. Needed at sign-in, where the user is constructed before any session
 *  exists. (Rehydration does not need it: getCurrentUser() reads the pool's
 *  own storage and passes it to the CognitoUser it builds.) */
function makeCognitoUser(username: string): CognitoUser {
  return new CognitoUser({
    Username: username,
    Pool: userPool,
    Storage: sessionBackedStorage,
  });
}

/** First letter of the first two words, uppercased. A single-word name takes
 *  its own first two letters instead, so "Cher" still yields "CH" rather than
 *  just "C". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return "";
}

/** Turns "test.officer" or "test-officer" from an email local-part into
 *  "Test Officer" — best-effort display name when Cognito has no `name`
 *  claim. */
function prettifyLocalPart(localPart: string): string {
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/** name claim -> prettified email local-part -> raw username. Never lets
 *  "undefined" reach the UI. */
export function resolveName(payload: IdTokenPayload): string {
  if (payload.name) return payload.name;
  if (payload.email) {
    const [localPart] = payload.email.split("@");
    if (localPart) return prettifyLocalPart(localPart);
  }
  return payload["cognito:username"] ?? "";
}

/** Picks one role from the `cognito:groups` array by explicit priority, or
 *  null when the array is absent or holds nothing we recognise. Returning
 *  null (rather than guessing) is deliberate: an unassigned user must fail
 *  login, not land on an arbitrary screen. */
export function resolveRole(payload: IdTokenPayload): Role | null {
  const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
  const role = ROLE_PRIORITY.find((role) => groups.includes(role)) ?? null;
  import.meta.env.DEV && log.debug("Resolved role", role, "from cognito:groups", groups);
  return role;
}

/** Maps a CognitoUserSession to this app's session shape, reading everything
 *  from the ID token payload (the one signed claim set that includes both
 *  profile attributes and group membership). */
function sessionToUser(session: CognitoUserSession): AuthUser {
  const payload = session.getIdToken().decodePayload() as IdTokenPayload;
  const name = resolveName(payload);
  const expiry = payload.exp ? new Date(payload.exp * 1000).toISOString() : "unknown";
  import.meta.env.DEV && log.debug("ID token expires at", expiry);
  return {
    username: payload["cognito:username"] ?? "",
    name,
    initials: initialsFor(name),
    role: resolveRole(payload),
  };
}

/** Maps a Cognito exception to the `{ ok: false, error }` shape the login
 *  form renders. NotAuthorizedException (wrong password) and
 *  UserNotFoundException (no such user) deliberately share one message —
 *  distinguishing them would tell an attacker which usernames exist. */
export function mapAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;

  if (code === "NotAuthorizedException" || code === "UserNotFoundException") {
    return "Unrecognised username or password.";
  }
  if (code === "PasswordResetRequiredException") {
    return "Your password must be reset before you can sign in. Contact an administrator.";
  }
  if (code === "UserNotConfirmedException") {
    return "This account has not been confirmed yet. Contact an administrator.";
  }

  log.error("Unhandled Cognito auth error:", err);
  return "Something went wrong while signing in. Please try again.";
}

/**
 * Authenticates against Cognito with USER_SRP_AUTH (the library default —
 * no auth flow is passed). Resolves with the same `{ ok, user }` /
 * `{ ok, error }` shape dummy-users.js's callers already expect.
 */
export function signIn(username: string, password: string): Promise<LoginResult> {
  import.meta.env.DEV && log.info("Sign-in attempt for", username);
  return new Promise((resolve) => {
    const cognitoUser = makeCognitoUser(username);
    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const user = sessionToUser(session);
        if (!user.role) {
          log.warn("Sign-in succeeded for", username, "but no role is assigned");
          resolve({
            ok: false,
            error: "Your account has no role assigned. Contact an administrator.",
          });
          return;
        }
        import.meta.env.DEV && log.info("Sign-in succeeded for", username, "with role", user.role);
        resolve({ ok: true, user });
      },

      onFailure: (err: unknown) => {
        const code =
          err && typeof err === "object" && "code" in err
            ? (err as { code?: string }).code
            : undefined;
        import.meta.env.DEV && log.info("Sign-in failed for", username, "code:", code);
        resolve({ ok: false, error: mapAuthError(err) });
      },

      // Fires instead of onSuccess/onFailure for admin-created users still in
      // FORCE_CHANGE_PASSWORD. Without this callback the SDK just waits
      // forever — no error, no success, login silently hangs. Our three test
      // users are CONFIRMED so this will not trigger for them, but any future
      // admin-created user will hit it on first sign-in.
      newPasswordRequired: () => {
        import.meta.env.DEV && log.info("Sign-in blocked for", username, "- new password required");
        resolve({
          ok: false,
          error: "This account requires a password reset before first sign-in.",
        });
      },
    });
  });
}

/**
 * Rehydrates the current Cognito session on page load, replacing
 * dummy-users.js's synchronous readStoredUser(). Resolves to `null` — never
 * rejects — when there is no signed-in user or the session is invalid, so
 * callers can treat "no session" and "not logged in" identically.
 *
 * getSession() also transparently refreshes an expired ID token using the
 * refresh token, when one is still valid.
 */
export function getCurrentSession(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      import.meta.env.DEV && log.debug("Rehydrate: no stored Cognito user");
      resolve(null);
      return;
    }

    function onSession(error: Error, session: null): void;
    function onSession(error: null, session: CognitoUserSession): void;
    function onSession(error: Error | null, session: CognitoUserSession | null): void {
      if (error || !session || !session.isValid()) {
        import.meta.env.DEV && log.debug("Rehydrate: no valid session");
        resolve(null);
        return;
      }
      import.meta.env.DEV && log.debug("Rehydrate: valid session found");
      resolve(sessionToUser(session));
    }
    cognitoUser.getSession(onSession);
  });
}

/** Signs the current Cognito user out and clears their session storage. */
export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    import.meta.env.DEV && log.info("Signing out", cognitoUser.getUsername());
    cognitoUser.signOut();
  }
}
