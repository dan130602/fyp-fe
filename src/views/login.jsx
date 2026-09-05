import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import { isCognitoMode } from "../auth/cognito-config.js";
import { listDemoAccounts } from "../auth/dummy-users.js";
import { homeRouteFor, labelForRole } from "../auth/roles.js";
import Button from "../components/shared/button.jsx";
import "../components/shared/shell.css";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homeRouteFor(user.role)} replace />;

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
      navigate(homeRouteFor(result.user.role), { replace: true });
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

        <Button variant="primary" type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>

        {!isCognitoMode() && (
          <div className="login-demo">
            <h2>Demo accounts</h2>
            <p>Prototype credentials — no backend, no password storage.</p>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {listDemoAccounts().map((account) => (
                  <tr key={account.username}>
                    <td>
                      <code>{account.username}</code>
                    </td>
                    <td>
                      <code>{account.password}</code>
                    </td>
                    <td>{labelForRole(account.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </div>
  );
}
