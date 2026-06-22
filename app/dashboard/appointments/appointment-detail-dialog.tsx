"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { setAppointmentStatusAction } from "@/lib/actions/appointments";
import { formatDateTime } from "@/lib/datetime";
import type { AppointmentStatus } from "@prisma/client";
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
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusPending, startStatus] = useTransition();

  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const transitions = NEXT_STATUSES[appointment.status];
  const canReschedule =
    appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED";

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
          {canReschedule ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/appointments/${appointment.id}/reschedule`}>
                Reschedule
              </Link>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
