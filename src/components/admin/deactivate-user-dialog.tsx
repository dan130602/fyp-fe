// Confirms deactivating or reactivating a user. Deactivation is destructive: it blocks sign-in
// immediately and revokes the Cognito login.
import { mapRoleOrStatusError } from "../../admin/error-mapping.ts";
import { useUpdateUserStatus } from "../../admin/use-admin-users.ts";
import type { AdminUser } from "../../admin/users-api.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";

interface DeactivateUserDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}

export default function DeactivateUserDialog({ user, onOpenChange }: DeactivateUserDialogProps) {
  const updateStatus = useUpdateUserStatus();
  const isDeactivating = user?.status === "ACTIVE";

  function close() {
    updateStatus.reset();
    onOpenChange(false);
  }

  function handleConfirm() {
    if (!user) return;
    updateStatus.mutate(
      { userId: user.id, status: isDeactivating ? "DISABLED" : "ACTIVE" },
      { onSuccess: close },
    );
  }

  return (
    <AlertDialog open={user !== null} onOpenChange={(next) => (next ? undefined : close())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? "Deactivate user" : "Activate user"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? isDeactivating
                ? `${user.name ?? user.email ?? "This user"} will be signed out immediately and cannot sign in again until reactivated.`
                : `${user.name ?? user.email ?? "This user"} will be able to sign in again.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {updateStatus.isError && (
          <p
            className="m-0 rounded-[7px] bg-red-soft px-2.5 py-2 text-[11px] font-bold text-red"
            role="alert"
          >
            {mapRoleOrStatusError(updateStatus.error)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={close}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={handleConfirm}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? "Saving..." : isDeactivating ? "Deactivate" : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
