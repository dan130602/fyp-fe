// Admin creates a user: email required, name optional, role picked from all three backend roles.
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { mapCreateUserError } from "../../admin/error-mapping.ts";
import { useCreateUser } from "../../admin/use-admin-users.ts";
import { BACKEND_ROLE_LABELS, BACKEND_ROLES, type BackendRole } from "../../admin/user-roles.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_ROLE: BackendRole = BACKEND_ROLES.COMPLIANCE_OFFICER;

export default function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<BackendRole>(DEFAULT_ROLE);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const createUser = useCreateUser();

  function resetAndClose() {
    setEmail("");
    setName("");
    setRole(DEFAULT_ROLE);
    setCreatedEmail(null);
    createUser.reset();
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createUser.mutate(
      { email, name: name || null, role },
      {
        onSuccess: (user) => {
          setCreatedEmail(user.email);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}>
      <DialogContent>
        {createdEmail ? (
          <>
            <DialogHeader>
              <DialogTitle>User created</DialogTitle>
              <DialogDescription>
                The account for {createdEmail} is active immediately. The initial password is the
                one configured on the server. Share it with the user out of band and have them
                change it after signing in.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={resetAndClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Provisions a Cognito login and an internal user record with the selected role.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-user-email">Email</Label>
                <Input
                  id="create-user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-user-name">Name (optional)</Label>
                <Input
                  id="create-user-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-user-role">Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as BackendRole)}>
                  <SelectTrigger id="create-user-role">
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
              </div>
              {createUser.isError && (
                <p
                  className="m-0 rounded-[7px] bg-red-soft px-2.5 py-2 text-[11px] font-bold text-red"
                  role="alert"
                >
                  {mapCreateUserError(createUser.error)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending || !email}>
                {createUser.isPending ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
