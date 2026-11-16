// Roles and their home routes; values match the backend's Role enum (t_user.role is authoritative).
import { ROUTES } from "../routes.ts";

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  OFFICER: "COMPLIANCE_OFFICER",
  DEVELOPER: "DEVELOPER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface AuthUser {
  username: string;
  name: string;
  initials: string;
}

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string };

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.MANAGER]: "Compliance manager",
  [ROLES.OFFICER]: "Compliance officer",
  [ROLES.DEVELOPER]: "Developer",
};

export const ROLE_HOME: Record<Role, string> = {
  [ROLES.ADMIN]: ROUTES.MANAGEMENT,
  [ROLES.MANAGER]: ROUTES.MANAGEMENT,
  [ROLES.OFFICER]: ROUTES.REVIEW,
  [ROLES.DEVELOPER]: `${ROUTES.DEVELOPER}?tab=production`,
};

export function homeRouteFor(role: Role | null | undefined): string {
  return (role && ROLE_HOME[role]) ?? ROUTES.LOGIN;
}

export function labelForRole(role: Role | null | undefined): string {
  return (role && ROLE_LABELS[role]) ?? "Unknown role";
}
