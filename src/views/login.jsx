import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "../auth/auth-context.jsx";
import { useCurrentUser } from "../auth/current-user.ts";
import { homeRouteFor } from "../auth/roles.js";
import "../components/shared/shell.css";

export default function Login() {
  const { user, role, loading, login, logout } = useAuth();
  const profile = useCurrentUser(Boolean(user));
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // While loading (rehydrating, or /me still resolving the role), wait rather than redirect early.
  if (loading)
    return (
      <div className="login">
        <div className="login-card" role="status">
          Checking your sign-in and account access...
        </div>
      </div>
    );
  if (user && role) {
    const destination =
      new URLSearchParams(location.search).get("next") === "production"
        ? "/developer?tab=production"
        : homeRouteFor(role);
    return <Navigate to={destination} replace />;
  }
  if (user)
    return (
      <div className="login">
        <div className="login-card">
          <h1>Account access unavailable</h1>
          <p role="alert">
            You are signed in, but ClearCall could not load your account permissions from the
            backend. Your session is still active. Try again when the service is available.
          </p>
          <Button
            type="button"
            className="login-submit"
            disabled={profile.isFetching}
            onClick={() => void profile.refetch()}
          >
            {profile.isFetching ? "Checking access..." : "Retry account check"}
          </Button>
          <Button type="button" variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    );

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return; // guard against double-submit while a request is in flight
    setSubmitting(true);
    setError("");
    try {
      const result = await login(username, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // The redirect above fires once `user`/`role` settle on the next render.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <span>✓</span>ClearCall
        </div>
        <h1>Sign in</h1>
        <p className="lead">
          Call review, checklist evidence, and pipeline evaluation. Your role decides which of those
          you see.
        </p>

        {error && <p className="login-error">{error}</p>}

        <label className="login-field">
          {/* Email is an alias attribute on the pool, so either value signs in. */}
          <span>Username or email</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <Button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
