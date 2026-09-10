// Confirms a role change before submitting it.
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { mapRoleOrStatusError } from "../../admin/error-mapping.ts";
import { useUpdateUserRole } from "../../admin/use-admin-users.ts";
import { BACKEND_ROLE_LABELS, BACKEND_ROLES, type BackendRole } from "../../admin/user-roles.ts";
import type { AdminUser } from "../../admin/users-api.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface ChangeRoleDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}

export default function ChangeRoleDialog({ user, onOpenChange }: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<BackendRole | null>(null);
  const updateRole = useUpdateUserRole();

  const role = selectedRole ?? user?.role ?? BACKEND_ROLES.COMPLIANCE_OFFICER;

  function close() {
    setSelectedRole(null);
    updateRole.reset();
    onOpenChange(false);
  }

  function handleConfirm() {
    if (!user) return;
    updateRole.mutate({ userId: user.id, role }, { onSuccess: close });
  }

  return (
    <Dialog open={user !== null} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {user ? `Update the role for ${user.name ?? user.email ?? "this user"}.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 flex flex-col gap-3.5">
          <Select value={role} onValueChange={(value) => setSelectedRole(value as BackendRole)}>
            <SelectTrigger aria-label="New role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(BACKEND_ROLES).map((value) => (
                <SelectItem key={value} value={value}>
                  {BACKEND_ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {updateRole.isError && (
            <p
              className="m-0 rounded-[7px] bg-red-soft px-2.5 py-2 text-[11px] font-bold text-red"
              role="alert"
            >
              {mapRoleOrStatusError(updateRole.error)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={updateRole.isPending || role === user?.role}
          >
            {updateRole.isPending ? "Saving..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
