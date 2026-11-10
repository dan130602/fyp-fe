import { useAuth } from "../../auth/auth-context.tsx";
import { useCurrentUser } from "../../auth/current-user.ts";
import { ROLES } from "../../auth/roles.ts";
import { ApiError } from "../../lib/api-client.ts";
import ObservabilityDashboard from "../observability/observability-dashboard.tsx";

/** The experiment route remains public; production data requires a reporting role. */
export default function ProductionPanel() {
  const { role, loading, isAuthenticated } = useAuth();
  const profile = useCurrentUser(Boolean(isAuthenticated));
  // The backend account supplies the reporting permission.
  const backendRole = String(profile.data?.role ?? "");
  const canReadMetrics =
    isAuthenticated &&
    (role === ROLES.ADMIN ||
      ["ADMIN", "SUPER_ADMIN", "MANAGER", "DEVELOPER"].includes(backendRole));
  if (loading || (isAuthenticated && profile.isPending && !profile.data))
    return (
      <div className="slot" role="status">
        Checking production access...
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="slot" role="status">
        <b>Sign in to view production observability</b>
        <p>
          Use your developer or reporting account. After sign-in, you will return to this dashboard.
        </p>
        <p>
          <a href="/login?next=production">Sign in to view dashboard</a>
        </p>
      </div>
    );
  if (profile.isError)
    return (
      <div className="slot" role="alert">
        <b>Production access could not be verified</b>
        <p>
          You are signed in, but the live backend account lookup failed
          {profile.error instanceof ApiError ? ` (HTTP ${profile.error.status})` : ""}.
        </p>
        <button type="button" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
          Retry access check
        </button>
      </div>
    );
  if (!canReadMetrics)
    return (
      <div className="slot" role="status">
        <b>Production reporting access required</b>
        <p>
          You are signed in in this tab. Backend role: <code>{backendRole || "Not returned"}</code>.
        </p>
        <p>
          The production endpoint requires DEVELOPER, ADMIN, SUPER_ADMIN or MANAGER. Use an account
          with reporting access, or contact your existing administrator.
        </p>
        <button type="button" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
          Recheck access
        </button>
      </div>
    );
  return <ObservabilityDashboard />;
}
