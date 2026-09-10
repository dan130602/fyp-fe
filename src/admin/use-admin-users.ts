// Thin TanStack Query wrappers over users-api. All mutations invalidate the list; role/status
// mutations also invalidate currentUser when the caller edited their own row (defence in depth,
// since the backend already refuses self-edits).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserStatus } from "../auth/current-user.ts";
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "../auth/current-user.ts";
import type { BackendRole } from "./user-roles.ts";
import type { CreateUserRequest } from "./users-api.ts";
import { createUser, listUsers, updateUserRole, updateUserStatus } from "./users-api.ts";

const ADMIN_USERS_QUERY_KEY = ["adminUsers"] as const;

export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: listUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    },
  });
}

/** Reads the cached /me id so a role/status mutation on the signed-in admin's own row also refreshes it. */
function useCurrentUserId(): string | undefined {
  const meQuery = useCurrentUser(true);
  return meQuery.data?.id;
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: BackendRole }) =>
      updateUserRole(userId, role),
    // updateRole can 500 with the DB already committed; invalidate on error too so the table re-reads truth.
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      if (variables.userId === currentUserId) {
        queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      }
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      updateUserStatus(userId, status),
    // Cognito is called before the DB write, so a failure can leave the two diverged; re-read either way.
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      if (variables.userId === currentUserId) {
        queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      }
    },
  });
}
