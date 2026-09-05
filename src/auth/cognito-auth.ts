// Real Cognito auth: sessionStorage-backed tokens, role resolved from cognito:groups.
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
const DEV = import.meta.env.DEV;

/** Claims read off the ID token payload, narrowed from decodePayload()'s `any`. */
interface IdTokenPayload {
  "cognito:username"?: string;
  "cognito:groups"?: unknown;
  name?: string;
  email?: string;
  exp?: number;
}

/** Priority order for a multi-group user; earlier wins. Unrecognised groups are ignored. */
const ROLE_PRIORITY: Role[] = [ROLES.OFFICER, ROLES.MANAGER, ROLES.DEVELOPER];

/** sessionStorage wrapped as ICognitoStorage, keeping tokens out of localStorage. */
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

/** Builds a CognitoUser tied to the pool's storage; needed at sign-in before any session exists. */
function makeCognitoUser(username: string): CognitoUser {
  return new CognitoUser({
    Username: username,
    Pool: userPool,
    Storage: sessionBackedStorage,
  });
}

/** First letter of the first two words, uppercased; a single word takes its own first two. */
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

/** Turns an email local-part like "test.officer" into "Test Officer" for display. */
function prettifyLocalPart(localPart: string): string {
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/** name claim -> prettified email local-part -> raw username; never lets "undefined" show. */
export function resolveName(payload: IdTokenPayload): string {
  if (payload.name) return payload.name;
  if (payload.email) {
    const [localPart] = payload.email.split("@");
    if (localPart) return prettifyLocalPart(localPart);
  }
  return payload["cognito:username"] ?? "";
}

/** Returns null (never a default) for no recognised group — an unassigned user must fail. */
export function resolveRole(payload: IdTokenPayload): Role | null {
  const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
  const role = ROLE_PRIORITY.find((role) => groups.includes(role)) ?? null;
  DEV && log.debug("Resolved role", role, "from cognito:groups", groups);
  return role;
}

/** Maps a session to this app's user shape, reading profile and group claims off the ID token. */
function sessionToUser(session: CognitoUserSession): AuthUser {
  const payload = session.getIdToken().decodePayload() as IdTokenPayload;
  const name = resolveName(payload);
  const expiry = payload.exp ? new Date(payload.exp * 1000).toISOString() : "unknown";
  DEV && log.debug("ID token expires at", expiry);
  return {
    username: payload["cognito:username"] ?? "",
    name,
    initials: initialsFor(name),
    role: resolveRole(payload),
  };
}

function errorCode(err: unknown): string | undefined {
  return err && typeof err === "object" && "code" in err
    ? (err as { code?: string }).code
    : undefined;
}

/** Wrong-password and no-such-user share one message on purpose, to avoid user enumeration. */
export function mapAuthError(err: unknown): string {
  const code = errorCode(err);

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

export function signIn(username: string, password: string): Promise<LoginResult> {
  DEV && log.info("Sign-in attempt for", username);
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
        DEV && log.info("Sign-in succeeded for", username, "with role", user.role);
        resolve({ ok: true, user });
      },

      onFailure: (err: unknown) => {
        DEV && log.info("Sign-in failed for", username, "code:", errorCode(err));
        resolve({ ok: false, error: mapAuthError(err) });
      },

      // Without this callback, a FORCE_CHANGE_PASSWORD user hangs forever: no error, no success.
      newPasswordRequired: () => {
        DEV && log.info("Sign-in blocked for", username, "- new password required");
        resolve({
          ok: false,
          error: "This account requires a password reset before first sign-in.",
        });
      },
    });
  });
}

/** Rehydrates the session on page load; resolves null (never rejects) if none or invalid. */
export function getCurrentSession(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      DEV && log.debug("Rehydrate: no stored Cognito user");
      resolve(null);
      return;
    }

    function onSession(error: Error, session: null): void;
    function onSession(error: null, session: CognitoUserSession): void;
    function onSession(error: Error | null, session: CognitoUserSession | null): void {
      if (error || !session || !session.isValid()) {
        DEV && log.debug("Rehydrate: no valid session");
        resolve(null);
        return;
      }
      DEV && log.debug("Rehydrate: valid session found");
      resolve(sessionToUser(session));
    }
    cognitoUser.getSession(onSession);
  });
}

/** ID token for the API client. Goes through getSession() so an expired token is refreshed. */
export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    function onSession(error: Error, session: null): void;
    function onSession(error: null, session: CognitoUserSession): void;
    function onSession(error: Error | null, session: CognitoUserSession | null): void {
      if (error || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    }
    cognitoUser.getSession(onSession);
  });
}

export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    DEV && log.info("Signing out", cognitoUser.getUsername());
    cognitoUser.signOut();
  }
}
