// Role is not a compliance status, so only ADMIN is coloured: blue marks the elevated
// role, and everything else stays neutral rather than borrowing a status tone.
import { BACKEND_ROLES, type BackendRole } from "./user-roles.ts";

export type RoleBadgeTone = "info" | "outline";

export function toneForRole(role: BackendRole): RoleBadgeTone {
  return role === BACKEND_ROLES.ADMIN ? "info" : "outline";
}
