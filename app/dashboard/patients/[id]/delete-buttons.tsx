"use client";

import { useActionState } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  archivePatientAction,
  hardDeletePatientAction,
  restorePatientAction,
} from "@/lib/actions/patients";
import { initialDeleteState } from "@/lib/auth/form-state";

export function ArchiveButton({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(
    archivePatientAction.bind(null, patientId),
    initialDeleteState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive aria-hidden /> Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive this patient?</DialogTitle>
          <DialogDescription>
            The record stays intact and can be restored. All linked appointments,
            treatments, and invoices remain associated.
          </DialogDescription>
        </DialogHeader>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>Cancel</Button>
          </DialogClose>
          <form action={action}>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Archiving…" : "Archive"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestoreButton({ patientId }: { patientId: string }) {
  const [, action, pending] = useActionState(
    restorePatientAction.bind(null, patientId),
    initialDeleteState,
  );
  return (
    <form action={action}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ArchiveRestore aria-hidden />
        {pending ? "Restoring…" : "Restore"}
      </Button>
    </form>
  );
}

export function HardDeleteButton({ patientId }: { patientId: string }) {
  const [state, action, pending] = useActionState(
    hardDeletePatientAction.bind(null, patientId),
    initialDeleteState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 aria-hidden /> Delete permanently
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this patient permanently?</DialogTitle>
          <DialogDescription>
            This cannot be undone. The patient&apos;s record, portal user, and any
            tooth-condition history will be removed. Blocked automatically when
            appointments, treatments, invoices, or documents exist.
          </DialogDescription>
        </DialogHeader>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>Cancel</Button>
          </DialogClose>
          <form action={action}>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
