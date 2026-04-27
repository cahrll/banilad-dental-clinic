"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteStaffAction } from "@/lib/actions/staff";

export function DeleteStaffButton({
  staffUserId,
  isSelf,
  hasWork,
}: {
  staffUserId: string;
  isSelf: boolean;
  hasWork: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (isSelf) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this staff account?</DialogTitle>
          <DialogDescription>
            Cannot be undone. The user&apos;s account, profile, and active sessions
            will be removed.
            {hasWork
              ? " This account has clinic activity on file — delete will be blocked. Deactivate instead."
              : ""}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await deleteStaffAction(staffUserId);
                if (!res.ok) setError(res.error ?? "Couldn't delete.");
              })
            }
          >
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
