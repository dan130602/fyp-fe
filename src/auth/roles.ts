// The three roles, their labels, and where each lands after login — enforces SoD via require-role.jsx.

export const ROLES = {
  OFFICER: "compliance-officer",
  DEVELOPER: "internal-developer",
  MANAGER: "compliance-manager",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthUser {
  username: string;
  name: string;
  initials: string;
  role: Role | null;
}

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string };

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.OFFICER]: "Compliance officer",
  [ROLES.DEVELOPER]: "Internal developer",
  [ROLES.MANAGER]: "Compliance manager",
};

/** Where a role goes when it logs in, or when it reaches a route it may not see. */
export const ROLE_HOME: Record<Role, string> = {
  [ROLES.OFFICER]: "/review",
  [ROLES.DEVELOPER]: "/developer",
  [ROLES.MANAGER]: "/management",
};

export function homeRouteFor(role: Role | null | undefined): string {
  return (role && ROLE_HOME[role]) ?? "/login";
}

export function labelForRole(role: Role | null | undefined): string {
  return (role && ROLE_LABELS[role]) ?? "Unknown role";
}
