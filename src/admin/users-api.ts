// Admin-only user management: list, create, and change role/status. All require ADMIN server-side.
import type { UserStatus } from "../auth/current-user.ts";
import { apiGet, apiPatch, apiPost } from "../lib/api-client.ts";
import type { BackendRole } from "./user-roles.ts";

/** Mirrors the backend's UserResponseDto record. */
export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: BackendRole;
  status: UserStatus;
  createdAt: string;
}

/** Mirrors the backend's CreateUserRequest record. */
export interface CreateUserRequest {
  email: string;
  name?: string | null;
  role: BackendRole;
}

/** Mirrors the backend's UpdateUserRoleDto record. */
export interface UpdateUserRoleRequest {
  role: BackendRole;
}

/** Mirrors the backend's UpdateUserStatusDto record. */
export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export function listUsers(): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("/api/users");
}

export function createUser(request: CreateUserRequest): Promise<AdminUser> {
  return apiPost<AdminUser>("/api/users", {
    email: request.email,
    name: request.name,
    role: request.role,
  } satisfies CreateUserRequest);
}

export function updateUserRole(userId: string, role: BackendRole): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/api/users/${userId}/role`, { role } satisfies UpdateUserRoleRequest);
}

export function updateUserStatus(userId: string, status: UserStatus): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/api/users/${userId}/status`, {
    status,
  } satisfies UpdateUserStatusRequest);
}
