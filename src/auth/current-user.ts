import { useQuery } from "@tanstack/react-query";
import type { BackendRole } from "../admin/user-roles.ts";
import { apiGet } from "../lib/api-client.ts";
import { ROLES, type Role } from "./roles.ts";

export type { BackendRole };
export type UserStatus = "ACTIVE" | "DISABLED";

export interface CurrentUser {
  id: string;
  // email and name are nullable columns on t_user; the provisioning path can save either as null.
  email: string | null;
  name: string | null;
  role: BackendRole;
  status: UserStatus;
}

/** Backend MANAGER folds into ADMIN — the frontend has no separate manager role. */
export function roleFromBackend(role: BackendRole): Role {
  if (role === "DEVELOPER") return ROLES.DEVELOPER;
  if (role === "ADMIN" || role === "MANAGER") return ROLES.ADMIN;
  return ROLES.OFFICER;
}

export const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiGet<CurrentUser>("/api/users/me"),
    enabled,
  });
}
