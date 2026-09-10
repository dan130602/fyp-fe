// Pure client-side search, filter, and sort over the full user list. No pagination server-side,
// so the whole list is held in memory and narrowed here.
import type { UserStatus } from "../auth/current-user.ts";
import type { BackendRole } from "./user-roles.ts";
import type { AdminUser } from "./users-api.ts";

export type SortColumn = "name" | "email" | "role" | "status" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface UserTableFilters {
  search: string;
  role: BackendRole | "ALL";
  status: UserStatus | "ALL";
}

export const DEFAULT_FILTERS: UserTableFilters = {
  search: "",
  role: "ALL",
  status: "ALL",
};

export function filterUsers(users: AdminUser[], filters: UserTableFilters): AdminUser[] {
  const search = filters.search.trim().toLowerCase();

  return users.filter((user) => {
    if (filters.role !== "ALL" && user.role !== filters.role) return false;
    if (filters.status !== "ALL" && user.status !== filters.status) return false;
    if (!search) return true;

    const name = user.name?.toLowerCase() ?? "";
    const email = user.email?.toLowerCase() ?? "";
    return name.includes(search) || email.includes(search);
  });
}

// Nulls always sort last; the direction factor is applied only to real values.
function compareNullable(a: string | null, b: string | null, factor: number): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return factor * a.localeCompare(b);
}

export function sortUsers(
  users: AdminUser[],
  column: SortColumn,
  direction: SortDirection,
): AdminUser[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    switch (column) {
      case "name":
        return compareNullable(a.name, b.name, factor);
      case "email":
        return compareNullable(a.email, b.email, factor);
      case "role":
        return factor * a.role.localeCompare(b.role);
      case "status":
        return factor * a.status.localeCompare(b.status);
      case "createdAt":
        return factor * a.createdAt.localeCompare(b.createdAt);
      default:
        return 0;
    }
  });
}

export function filterAndSortUsers(
  users: AdminUser[],
  filters: UserTableFilters,
  column: SortColumn,
  direction: SortDirection,
): AdminUser[] {
  return sortUsers(filterUsers(users, filters), column, direction);
}
