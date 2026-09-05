import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError } from "../lib/api-client.ts";
import { createLogger } from "../lib/logger.ts";
import { queryClient } from "../lib/query-client.ts";
import * as cognitoAuth from "./cognito-auth.ts";
import { roleFromBackend, useCurrentUser } from "./current-user.ts";
import type { AuthUser, LoginResult, Role } from "./roles.ts";

const log = createLogger("auth");
const DEV = import.meta.env.DEV;

export interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns sign-in, sign-out, and the single `loading` flag for the whole app.
 *
 * Cognito authenticates and supplies identity only; `/me` supplies the role. `loading`
 * stays true until the Cognito session rehydration and, once signed in, `/me` have both
 * settled — there is no third state in between.
 *
 * - `/me` 401: the backend rejects this session — sign out.
 * - `/me` network error / 5xx: keep the session, surface the error, do not sign out. A
 *   backend restart should not log everyone out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AuthUser | null>(null);
  const [rehydrating, setRehydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    DEV && log.debug("Rehydration starting");
    cognitoAuth.getCurrentSession().then((sessionUser) => {
      if (cancelled) return;
      DEV && log.debug("Rehydration settled:", sessionUser ? "restored session" : "no session");
      setIdentity(sessionUser);
      setRehydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const meQuery = useCurrentUser(Boolean(identity));

  const unauthorizedByBackend =
    meQuery.isError && meQuery.error instanceof ApiError && meQuery.error.isUnauthorized;

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const result = await cognitoAuth.signIn(username, password);
    if (!result.ok) return result;
    DEV && log.info("Login transition: signed in as", result.user.username);
    setIdentity(result.user);
    return result;
  }, []);

  // Must stay synchronous — top-nav.jsx passes it straight to an onClick handler.
  const logout = useCallback(() => {
    DEV && log.info("Logout transition");
    cognitoAuth.signOut();
    setIdentity(null);
    queryClient.clear();
  }, []);

  // /me 401 means the backend rejects this Cognito session outright — sign out.
  useEffect(() => {
    if (!unauthorizedByBackend) return;
    DEV && log.info("/me returned 401 - Cognito session rejected by backend, signing out");
    logout();
  }, [unauthorizedByBackend, logout]);

  const value = useMemo<AuthContextValue>(() => {
    // Still rehydrating the Cognito session, or not signed in: no role to resolve yet.
    if (rehydrating || !identity) {
      return {
        user: identity,
        role: null,
        isAuthenticated: false,
        loading: rehydrating,
        login,
        logout,
      };
    }

    // logout() above will flip identity to null on the next render; report signed-out now.
    if (unauthorizedByBackend) {
      return { user: null, role: null, isAuthenticated: false, loading: false, login, logout };
    }

    // Signed in with Cognito, /me not yet settled: still loading, no third state.
    if (meQuery.isPending) {
      return { user: identity, role: null, isAuthenticated: true, loading: true, login, logout };
    }

    if (meQuery.data) {
      return {
        user: identity,
        role: roleFromBackend(meQuery.data.role),
        isAuthenticated: true,
        loading: false,
        login,
        logout,
      };
    }

    // /me failed with something other than 401 (network error, 5xx): do not sign out, surface
    // the error, and keep the session without a resolved role.
    if (meQuery.isError) log.error("/me failed (non-401), keeping session:", meQuery.error);
    return { user: identity, role: null, isAuthenticated: true, loading: false, login, logout };
  }, [
    identity,
    rehydrating,
    meQuery.isPending,
    meQuery.data,
    meQuery.isError,
    meQuery.error,
    unauthorizedByBackend,
    login,
    logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return context;
}
