// Admin-only user management: list, search/filter/sort, create, change role, activate/deactivate.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useAdminUsers } from "../admin/use-admin-users.ts";
import {
  DEFAULT_FILTERS,
  filterAndSortUsers,
  type SortColumn,
  type SortDirection,
  type UserTableFilters,
} from "../admin/user-table-utils.ts";
import type { AdminUser } from "../admin/users-api.ts";
import { useAuth } from "../auth/auth-context.jsx";
import { useCurrentUser } from "../auth/current-user.ts";
import ChangeRoleDialog from "../components/admin/change-role-dialog.tsx";
import CreateUserDialog from "../components/admin/create-user-dialog.tsx";
import DeactivateUserDialog from "../components/admin/deactivate-user-dialog.tsx";
import UserTable, { UserTableSkeleton } from "../components/admin/user-table.tsx";
import UserTableToolbar from "../components/admin/user-table-toolbar.tsx";
import { ApiError } from "../lib/api-client.ts";

export default function AdminUsers() {
  const { isAuthenticated } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated);
  const usersQuery = useAdminUsers();

  const [filters, setFilters] = useState<UserTableFilters>(DEFAULT_FILTERS);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);

  const visibleUsers = useMemo(() => {
    if (!usersQuery.data) return [];
    return filterAndSortUsers(usersQuery.data, filters, sortColumn, sortDirection);
  }, [usersQuery.data, filters, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const isForbidden =
    usersQuery.isError && usersQuery.error instanceof ApiError && usersQuery.error.isForbidden;

  return (
    <div className="mx-auto max-w-[1200px] px-[34px] pt-7 pb-12">
      <header className="mb-5 flex items-start justify-between gap-5">
        <div>
          <h1 className="mb-1 text-[22px] leading-tight tracking-[-0.03em] text-ink">
            User management
          </h1>
          <p className="text-xs text-muted">
            Create accounts, change roles, and activate or deactivate access.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create user
        </Button>
      </header>

      {isForbidden ? (
        <div className="admin-panel-alert" role="alert">
          <h2 className="mb-1.5 text-[15px] text-red">
            You do not have permission to view this page
          </h2>
          <p className="text-xs text-muted">
            User management is restricted to administrators. Compliance managers cannot create or
            edit users.
          </p>
        </div>
      ) : usersQuery.isPending ? (
        <UserTableSkeleton />
      ) : usersQuery.isError ? (
        <div className="admin-panel-alert" role="alert">
          <h2 className="mb-1.5 text-[15px] text-red">Could not load users</h2>
          <p className="text-xs text-muted">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "An unexpected error occurred."}
          </p>
        </div>
      ) : (
        <>
          <UserTableToolbar filters={filters} onChange={setFilters} />
          {visibleUsers.length === 0 ? (
            <div className="admin-panel">
              {usersQuery.data && usersQuery.data.length > 0 ? (
                <>
                  <h2 className="mb-1.5 text-[15px] text-ink">No users match these filters</h2>
                  <p className="text-xs text-muted">
                    Clear the search or filters to see the full list.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-1.5 text-[15px] text-ink">No users yet</h2>
                  <p className="text-xs text-muted">Create the first account to get started.</p>
                </>
              )}
            </div>
          ) : (
            <UserTable
              users={visibleUsers}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onChangeRole={setRoleTarget}
              onChangeStatus={setStatusTarget}
              currentUserId={meQuery.data?.id}
            />
          )}
        </>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ChangeRoleDialog user={roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)} />
      <DeactivateUserDialog
        user={statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      />
    </div>
  );
}
