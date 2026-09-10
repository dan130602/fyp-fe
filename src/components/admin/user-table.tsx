// Dense table of users with sortable columns and role/status pills.
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { toneForRole } from "@/admin/role-badge-tone.ts";
import { BACKEND_ROLE_LABELS } from "@/admin/user-roles.ts";
import type { SortColumn, SortDirection } from "@/admin/user-table-utils.ts";
import type { AdminUser } from "@/admin/users-api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table.tsx";

interface UserTableProps {
  users: AdminUser[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onChangeRole: (user: AdminUser) => void;
  onChangeStatus: (user: AdminUser) => void;
  currentUserId: string | undefined;
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created" },
];

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) {
  if (column !== sortColumn)
    return <ArrowUpDown className="h-3 w-3 opacity-55" aria-hidden="true" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3 opacity-55" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3 w-3 opacity-55" aria-hidden="true" />
  );
}

export function UserTableSkeleton() {
  const rows = Array.from({ length: 6 }, (_, index) => index);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row}>
            {COLUMNS.map((column) => (
              <TableCell key={column.key}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function UserTable({
  users,
  sortColumn,
  sortDirection,
  onSort,
  onChangeRole,
  onChangeStatus,
  currentUserId,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead
              key={column.key}
              aria-sort={
                column.key === sortColumn
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.25 border-0 bg-transparent p-0 font-[inherit] text-inherit"
                onClick={() => onSort(column.key)}
                aria-label={`Sort by ${column.label}`}
              >
                {column.label}
                <SortIcon
                  column={column.key}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                />
              </button>
            </TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <TableRow key={user.id}>
              <TableCell>{user.name ?? "No name on file"}</TableCell>
              <TableCell>{user.email ?? "No email on file"}</TableCell>
              <TableCell>
                <Badge variant={toneForRole(user.role)}>{BACKEND_ROLE_LABELS[user.role]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.status === "ACTIVE" ? "pass" : "risk"}>
                  {user.status === "ACTIVE" ? "Active" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell>{formatCreatedAt(user.createdAt)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onChangeRole(user)}
                    disabled={isSelf}
                    title={isSelf ? "You cannot change your own role" : undefined}
                  >
                    Change role
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onChangeStatus(user)}
                    disabled={isSelf}
                    title={isSelf ? "You cannot change your own status" : undefined}
                  >
                    {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
