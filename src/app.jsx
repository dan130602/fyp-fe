import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/auth-context.jsx";
import RequireRole from "./auth/require-role.jsx";
import { ROLES, homeRouteFor } from "./auth/roles.js";
import AppShell from "./components/shared/app-shell.jsx";
import ComplianceOfficer from "./views/compliance-officer.jsx";
import InternalDeveloper from "./views/internal-developer.jsx";
import Login from "./views/login.jsx";
import Management from "./views/management.jsx";

/** Send "/" and anything unrecognised to wherever the current role belongs. */
function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={user ? homeRouteFor(user.role) : "/login"} replace />;
}

/** One guarded route: role check, then the shared session chrome, then the view. */
function guarded(allow, view) {
  return (
    <RequireRole allow={allow}>
      <AppShell>{view}</AppShell>
    </RequireRole>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/review" element={guarded([ROLES.OFFICER], <ComplianceOfficer />)} />
          <Route path="/developer" element={guarded([ROLES.DEVELOPER], <InternalDeveloper />)} />
          <Route path="/management" element={guarded([ROLES.MANAGER], <Management />)} />
          <Route path="*" element={<RoleHome />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
