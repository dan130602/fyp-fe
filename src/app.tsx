import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/auth-context.tsx";
import RequireRole from "./auth/require-role.tsx";
import { homeRouteFor, ROLES, type Role } from "./auth/roles.ts";
import AppShell from "./components/shared/app-shell.jsx";
import { queryClient } from "./lib/query-client.ts";
import { ROUTES } from "./routes.ts";
import AdminUsers from "./views/admin-users.tsx";
import ComplianceOfficer from "./views/compliance-officer.tsx";
import InternalDeveloper from "./views/internal-developer.jsx";
import Login from "./views/login.jsx";
import Management from "./views/management.jsx";

/** Send "/" and anything unrecognised to wherever the current role belongs. */
function RoleHome() {
  const { user, role, loading } = useAuth();
  // Same rehydration race as RequireRole: don't decide "/login" until the session check settles.
  if (loading) return null;
  return <Navigate to={user ? homeRouteFor(role) : ROUTES.LOGIN} replace />;
}

/** One guarded route: role check, then the shared session chrome, then the view. */
function guarded(allow: Role[], view: ReactNode) {
  return (
    <RequireRole allow={allow}>
      <AppShell>{view}</AppShell>
    </RequireRole>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REVIEW} element={guarded([ROLES.OFFICER], <ComplianceOfficer />)} />
            {/* Unguarded: the ablation view reads mock data only and has no backend role. */}
            <Route
              path={ROUTES.DEVELOPER}
              element={
                <AppShell>
                  <InternalDeveloper />
                </AppShell>
              }
            />
            <Route
              path={ROUTES.MANAGEMENT}
              element={guarded([ROLES.ADMIN, ROLES.MANAGER], <Management />)}
            />
            <Route path={ROUTES.ADMIN_USERS} element={guarded([ROLES.ADMIN], <AdminUsers />)} />
            <Route path="*" element={<RoleHome />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
