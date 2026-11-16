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

/** SUPER_ADMIN folds into ADMIN for routing; MANAGER keeps its own role (management view only). */
export function roleFromBackend(role: BackendRole): Role {
  if (role === "DEVELOPER") return ROLES.DEVELOPER;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return ROLES.ADMIN;
  if (role === "MANAGER") return ROLES.MANAGER;
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
