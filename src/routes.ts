// Route paths. ROLE_HOME in auth/roles.ts must resolve to real <Route path> values; both read these.

export const ROUTES = {
  LOGIN: "/login",
  REVIEW: "/review",
  DEVELOPER: "/developer",
  MANAGEMENT: "/management",
  ADMIN_USERS: "/admin/users",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
