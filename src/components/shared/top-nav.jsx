import { useAuth } from "../../auth/auth-context.jsx";
import { labelForRole } from "../../auth/roles.js";
import Badge from "./badge.jsx";
import Button from "./button.jsx";

/**
 * Session bar shared by every authenticated route: who is signed in, in which
 * role, and how to get out. Deliberately slim so it sits above each view's own
 * chrome without competing with it.
 */
export default function TopNav() {
  const { user, role, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="topnav">
      <div className="topnav-brand">
        <span>✓</span>ClearCall
      </div>
      <div className="topnav-session">
        <Badge tone="info">{labelForRole(role)}</Badge>
        <span className="topnav-user">
          <b>{user.name}</b>
          <small>@{user.username}</small>
        </span>
        <Button onClick={logout}>Sign out</Button>
      </div>
    </div>
  );
}
