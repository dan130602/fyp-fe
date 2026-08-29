import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authenticate } from "./dummy-users.js";

/* ---------------------------------------------------------------------------
   Session state for the prototype: React context over sessionStorage, so a page
   refresh keeps you logged in and closing the tab logs you out. No token, no
   expiry, no refresh — there is no backend to hold any of that.
--------------------------------------------------------------------------- */

const STORAGE_KEY = "clearcall.session";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  try {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing or storage disabled — the session just will not survive a refresh */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((username, password) => {
    const match = authenticate(username, password);
    if (!match) return { ok: false, error: "Unrecognised username or password." };
    writeStoredUser(match);
    setUser(match);
    return { ok: true, user: match };
  }, []);

  const logout = useCallback(() => {
    writeStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, role: user?.role ?? null, isAuthenticated: Boolean(user), login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an <AuthProvider>.");
  return context;
}
