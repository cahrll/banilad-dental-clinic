"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import {
  BookingPicker,
  type BookingSelection,
} from "@/components/app/booking-picker";
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

const STANDARD_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

function nearestStandardDuration(minutes: number): number {
  let best = STANDARD_DURATIONS[0] as number;
  let bestDelta = Math.abs(minutes - best);
  for (const m of STANDARD_DURATIONS) {
    const delta = Math.abs(minutes - m);
    if (delta < bestDelta) {
      best = m;
      bestDelta = delta;
    }
  }
  return best;
}

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
  const originalDurationMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const pickerDuration = nearestStandardDuration(originalDurationMinutes);

  const [selection, setSelection] = useState<BookingSelection | null>({
    startsAt: start,
    endsAt: new Date(start.getTime() + pickerDuration * 60000),
    dentistId: appointment.dentistId,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (reschedState.conflict) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(null);
      setRefreshKey((k) => k + 1);
    }
  }, [reschedState.conflict]);

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
      <DialogContent className="max-w-3xl">
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
              <BookingPicker
                mode="staff"
                dentists={[
                  { id: appointment.dentistId, name: appointment.dentistName },
                ]}
                durationMinutes={pickerDuration}
                excludeAppointmentId={appointment.id}
                initialStart={start}
                refreshKey={refreshKey}
                onChange={setSelection}
              />
              <FieldError errors={toFieldErrors(reschedState.fieldErrors?.startsAt)} />
              <FieldError errors={toFieldErrors(reschedState.fieldErrors?.endsAt)} />
              <input
                type="hidden"
                name="startsAt"
                value={selection ? isoDatetimeLocal(selection.startsAt) : ""}
              />
              <input
                type="hidden"
                name="endsAt"
                value={selection ? isoDatetimeLocal(selection.endsAt) : ""}
              />
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
              <Button type="submit" disabled={reschedPending || !selection}>
                {reschedPending ? "Saving…" : "Save new time"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
