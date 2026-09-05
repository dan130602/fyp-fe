// Roles and their home routes; values match the backend's Role enum (t_user.role is authoritative).

export const ROLES = {
  ADMIN: "ADMIN",
  OFFICER: "COMPLIANCE_OFFICER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthUser {
  username: string;
  name: string;
  initials: string;
}

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string };

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: "Compliance manager",
  [ROLES.OFFICER]: "Compliance officer",
};

export const ROLE_HOME: Record<Role, string> = {
  [ROLES.ADMIN]: "/management",
  [ROLES.OFFICER]: "/review",
};

export function homeRouteFor(role: Role | null | undefined): string {
  return (role && ROLE_HOME[role]) ?? "/login";
}

export function labelForRole(role: Role | null | undefined): string {
  return (role && ROLE_LABELS[role]) ?? "Unknown role";
}
