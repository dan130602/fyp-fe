import { Link } from "react-router-dom";
import { useAuth } from "@/auth/auth-context.tsx";
import { labelForRole, ROLES } from "@/auth/roles.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ROUTES } from "@/routes.ts";

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
        {role === ROLES.ADMIN && (
          <Link to={ROUTES.ADMIN_USERS} className="topnav-link">
            Manage users
          </Link>
        )}
        <Badge variant="info">{labelForRole(role)}</Badge>
        <span className="topnav-user">
          <b>{user.name}</b>
          <small>@{user.username}</small>
        </span>
        <Button
          size="xs"
          variant="secondary"
          onClick={logout}
          className="bg-white text-black hover:bg-white/90"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
