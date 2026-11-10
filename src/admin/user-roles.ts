// Admin-scoped role vocabulary: the full set stored in t_user.role, distinct from auth's Role
// (which only governs routing and folds MANAGER into ADMIN). This module is the single
// definition of BackendRole; src/auth/current-user.ts re-exports it.

export const BACKEND_ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  COMPLIANCE_OFFICER: "COMPLIANCE_OFFICER",
  DEVELOPER: "DEVELOPER",
} as const;

export type BackendRole = (typeof BACKEND_ROLES)[keyof typeof BACKEND_ROLES];

// Admin-screen labels; ADMIN and MANAGER must stay distinct here.
export const BACKEND_ROLE_LABELS: Record<BackendRole, string> = {
  [BACKEND_ROLES.ADMIN]: "Administrator",
  [BACKEND_ROLES.MANAGER]: "Compliance manager",
  [BACKEND_ROLES.COMPLIANCE_OFFICER]: "Compliance officer",
  [BACKEND_ROLES.DEVELOPER]: "Developer",
};

export function labelForBackendRole(role: BackendRole): string {
  return BACKEND_ROLE_LABELS[role];
}
