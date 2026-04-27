"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import {
  initialAppointmentFormState,
  toFieldErrors,
} from "@/lib/auth/form-state";
import {
  rescheduleAppointmentAction,
  setAppointmentStatusAction,
} from "@/lib/actions/appointments";
import { formatDateTime, isoDatetimeLocal } from "@/lib/datetime";
import type { AppointmentStatus } from "@/generated/prisma/client";
import type { CalendarAppointment } from "./week-grid";

const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: ["SCHEDULED"],
  NO_SHOW: ["SCHEDULED"],
};

const STATUS_VERBS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Re-open",
  CONFIRMED: "Confirm",
  COMPLETED: "Mark complete",
  CANCELLED: "Cancel",
  NO_SHOW: "Mark no-show",
};

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: CalendarAppointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reschedState, reschedAction, reschedPending] = useActionState(
    rescheduleAppointmentAction.bind(null, appointment.id),
    initialAppointmentFormState,
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusPending, startStatus] = useTransition();

  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const transitions = NEXT_STATUSES[appointment.status];

  function handleStatus(next: AppointmentStatus) {
    setStatusError(null);
    startStatus(async () => {
      const result = await setAppointmentStatusAction(appointment.id, next);
      if (!result.ok) setStatusError(result.error ?? "Couldn't update status.");
      else onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {appointment.patientName}
            <AppointmentStatusBadge status={appointment.status} />
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(start)} → {formatDateTime(end)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Dentist: </span>
            {appointment.dentistName}
          </p>
          {appointment.reason ? (
            <p>
              <span className="text-muted-foreground">Reason: </span>
              {appointment.reason}
            </p>
          ) : null}
          <p>
            <Link
              href={`/dashboard/patients/${appointment.patientId}`}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Open patient record →
            </Link>
          </p>
        </div>

        {statusError ? (
          <Alert variant="destructive">
            <AlertDescription>{statusError}</AlertDescription>
          </Alert>
        ) : null}

        {!editing ? (
          <div className="flex flex-wrap gap-2">
            {transitions.map((s) => (
              <Button
                key={s}
                variant={s === "CANCELLED" || s === "NO_SHOW" ? "outline" : "default"}
                size="sm"
                disabled={statusPending}
                onClick={() => handleStatus(s)}
              >
                {STATUS_VERBS[s]}
              </Button>
            ))}
            {appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED" ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Reschedule
              </Button>
            ) : null}
          </div>
        ) : (
          <form action={reschedAction}>
            <FieldGroup>
              {reschedState.formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{reschedState.formError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!reschedState.fieldErrors?.startsAt}>
                  <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
                  <Input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={isoDatetimeLocal(start)}
                  />
                  <FieldError errors={toFieldErrors(reschedState.fieldErrors?.startsAt)} />
                </Field>
                <Field data-invalid={!!reschedState.fieldErrors?.endsAt}>
                  <FieldLabel htmlFor="endsAt">Ends</FieldLabel>
                  <Input
                    id="endsAt"
                    name="endsAt"
                    type="datetime-local"
                    required
                    defaultValue={isoDatetimeLocal(end)}
                  />
                  <FieldError errors={toFieldErrors(reschedState.fieldErrors?.endsAt)} />
                </Field>
              </div>
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={reschedPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={reschedPending}>
                {reschedPending ? "Saving…" : "Save new time"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
