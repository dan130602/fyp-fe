// Search box plus role and status filters for the admin user table.

import { BACKEND_ROLE_LABELS, BACKEND_ROLES, type BackendRole } from "../../admin/user-roles.ts";
import type { UserTableFilters } from "../../admin/user-table-utils.ts";
import type { UserStatus } from "../../auth/current-user.ts";
import { Input } from "../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface UserTableToolbarProps {
  filters: UserTableFilters;
  onChange: (filters: UserTableFilters) => void;
}

export default function UserTableToolbar({ filters, onChange }: UserTableToolbarProps) {
  return (
    <div className="mb-3.5 flex flex-wrap gap-2.5">
      <Input
        type="text"
        placeholder="Search by name or email"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
        className="max-w-[280px]"
        aria-label="Search users"
      />
      <Select
        value={filters.role}
        onValueChange={(value) => onChange({ ...filters, role: value as BackendRole | "ALL" })}
      >
        <SelectTrigger aria-label="Filter by role">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All roles</SelectItem>
          {Object.values(BACKEND_ROLES).map((role) => (
            <SelectItem key={role} value={role}>
              {BACKEND_ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.status}
        onValueChange={(value) => onChange({ ...filters, status: value as UserStatus | "ALL" })}
      >
        <SelectTrigger aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="DISABLED">Disabled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
