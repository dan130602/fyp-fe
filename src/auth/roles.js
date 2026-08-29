/* ---------------------------------------------------------------------------
   The three roles, their labels, and where each one lands after login.

   Segregation of duties is the point: only the compliance officer can change a
   verdict, and the internal developer must never be able to. That rule is
   enforced by the route guard in require-role.jsx, which reads this file.
--------------------------------------------------------------------------- */

export const ROLES = {
  OFFICER: "compliance-officer",
  DEVELOPER: "internal-developer",
  MANAGER: "compliance-manager",
};

export const ROLE_LABELS = {
  [ROLES.OFFICER]: "Compliance officer",
  [ROLES.DEVELOPER]: "Internal developer",
  [ROLES.MANAGER]: "Compliance manager",
};

/** Where a role goes when it logs in, or when it reaches a route it may not see. */
export const ROLE_HOME = {
  [ROLES.OFFICER]: "/review",
  [ROLES.DEVELOPER]: "/developer",
  [ROLES.MANAGER]: "/management",
};

export function homeRouteFor(role) {
  return ROLE_HOME[role] ?? "/login";
}

export function labelForRole(role) {
  return ROLE_LABELS[role] ?? "Unknown role";
}
