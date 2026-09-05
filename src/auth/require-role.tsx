import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { createLogger } from "../lib/logger.ts";
import { useAuth } from "./auth-context.tsx";
import { homeRouteFor, type Role } from "./roles.ts";

const log = createLogger("auth");

// Route guard: bounces anonymous visitors to /login, unauthorized ones to their own home route.

export default function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While rehydration settles, render nothing — a refresh would flash /login before landing back.
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!user.role || !allow.includes(user.role)) {
    log.warn("Role denied:", user.role, "may not access", location.pathname, "- allowed:", allow);
    return <Navigate to={homeRouteFor(user.role)} replace />;
  }

  return children;
}
