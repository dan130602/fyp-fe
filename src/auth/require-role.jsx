import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context.jsx";
import { homeRouteFor } from "./roles.js";

/* ---------------------------------------------------------------------------
   Route guard. Wrap a route element in <RequireRole allow={[...]}> and it will:

     - send anonymous visitors to /login, remembering where they were headed
     - send signed-in users who lack the role to their own home route

   Bouncing rather than rendering an empty page is deliberate: a compliance
   officer who types /developer should end up somewhere useful, and a developer
   must never reach a screen that can change a verdict.
--------------------------------------------------------------------------- */

export default function RequireRole({ allow, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!allow.includes(user.role)) return <Navigate to={homeRouteFor(user.role)} replace />;

  return children;
}
