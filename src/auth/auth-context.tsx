import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createLogger } from "../lib/logger.ts";
import * as cognitoAuth from "./cognito-auth.ts";
import { isCognitoMode } from "./cognito-config.ts";
import { authenticate } from "./dummy-users.ts";
import type { AuthUser, LoginResult } from "./roles.ts";

const log = createLogger("auth");

// TEMPORARY SCAFFOLDING: dummy/Cognito branch below is temporary until Cognito is the only path.

const STORAGE_KEY = "clearcall.session";

export interface AuthContextValue {
  user: AuthUser | null;
  role: AuthUser["role"] | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null): void {
  try {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing or storage disabled — the session just will not survive a refresh */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cognitoMode = isCognitoMode();

  // Dummy mode has nothing to await, so it can start already-settled.
  // Cognito mode starts unsettled until the mount effect below resolves.
  const [user, setUser] = useState<AuthUser | null>(cognitoMode ? null : readStoredUser);
  const [loading, setLoading] = useState(cognitoMode);

  useEffect(() => {
    if (!cognitoMode) return;
    let cancelled = false;

    import.meta.env.DEV && log.debug("Rehydration starting");
    cognitoAuth.getCurrentSession().then((sessionUser) => {
      if (cancelled) return;
      import.meta.env.DEV &&
        log.debug("Rehydration settled:", sessionUser ? "restored session" : "no session");
      setUser(sessionUser);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cognitoMode]);

  /* Always returns a Promise, regardless of backend, so callers (login.jsx)
     never need to know which mode is active. Dummy mode's authenticate() is
     synchronous under the hood, but is wrapped so the signature matches. */
  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      if (cognitoMode) {
        const result = await cognitoAuth.signIn(username, password);
        if (!result.ok) return result;
        import.meta.env.DEV && log.info("Login transition: signed in as", result.user.username);
        setUser(result.user);
        return result;
      }

      const match = authenticate(username, password);
      if (!match) return { ok: false, error: "Unrecognised username or password." };
      import.meta.env.DEV && log.info("Login transition: signed in as", match.username);
      writeStoredUser(match);
      setUser(match);
      return { ok: true, user: match };
    },
    [cognitoMode],
  );

  /* Must stay a plain synchronous function — top-nav.jsx passes it straight
     to an onClick handler. Cognito's signOut() itself is synchronous (it just
     clears the SDK's session storage), so no async boundary is needed here. */
  const logout = useCallback(() => {
    import.meta.env.DEV && log.info("Logout transition");
    if (cognitoMode) {
      cognitoAuth.signOut();
      setUser(null);
      return;
    }

    writeStoredUser(null);
    setUser(null);
  }, [cognitoMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return context;
}
