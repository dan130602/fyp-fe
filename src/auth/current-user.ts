import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api-client.ts";
import { ROLES, type Role } from "./roles.ts";

export type BackendRole = "ADMIN" | "COMPLIANCE_OFFICER" | "MANAGER";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: BackendRole;
  status: UserStatus;
}

/** Backend MANAGER folds into ADMIN — the frontend has no separate manager role. */
export function roleFromBackend(role: BackendRole): Role {
  if (role === "ADMIN" || role === "MANAGER") return ROLES.ADMIN;
  return ROLES.OFFICER;
}

const CURRENT_USER_QUERY_KEY = ["currentUser"] as const;

export function useCurrentUser(enabled: boolean) {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiGet<CurrentUser>("/api/users/me"),
    enabled,
  });
}
