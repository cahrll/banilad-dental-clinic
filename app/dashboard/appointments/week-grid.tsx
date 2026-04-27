"use client";

import { useState } from "react";
import { isSameDay } from "date-fns";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  formatDayHeader,
  formatTime,
} from "@/lib/datetime";
import { cn } from "@/lib/utils";
import {
  AppointmentStatusBadge,
  APPOINTMENT_STATUS_LABELS,
} from "@/components/app/status-badge";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";

export type CalendarAppointment = {
  id: string;
  startsAt: string; // ISO
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
};

const HOUR_HEIGHT_PX = 72; // each hour row — sized for 2-3 lines of card text
const SLOT_MINUTES = 60;
const TOTAL_HOURS = CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR;
// Below this rendered card height, only the patient name is shown so short
// slots (e.g. 15 min) don't render clipped/garbled secondary text.
const COMPACT_BLOCK_THRESHOLD_PX = 44;

export function WeekGrid({
  days,
  appointments,
}: {
  days: Date[];
  appointments: CalendarAppointment[];
}) {
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);

  return (
    <>
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b text-xs">
        <div className="border-r bg-muted/40" />
        {days.map((d) => {
          const { weekday, dayMonth } = formatDayHeader(d);
          const today = isSameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r py-2 last:border-r-0",
                today && "bg-primary/5",
              )}
            >
              <span className="text-muted-foreground">{weekday}</span>
              <span className={cn("text-sm font-medium", today && "text-primary")}>
                {dayMonth}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
        <div className="border-r bg-muted/40">
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
            const hour = CALENDAR_DAY_START_HOUR + i;
            return (
              <div
                key={hour}
                className="flex items-start justify-end px-2 pt-1 text-xs text-muted-foreground"
                style={{ height: HOUR_HEIGHT_PX }}
              >
                {formatHourLabel(hour)}
              </div>
            );
          })}
        </div>

        {days.map((day) => {
          const dayAppts = appointments.filter((a) =>
            isSameDay(new Date(a.startsAt), day),
          );
          return (
            <div
              key={day.toISOString()}
              className="relative border-r last:border-r-0"
              style={{ height: HOUR_HEIGHT_PX * TOTAL_HOURS }}
            >
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/60 last:border-b-0"
                  style={{ height: HOUR_HEIGHT_PX }}
                />
              ))}
              {dayAppts.map((a) => (
                <AppointmentBlock
                  key={a.id}
                  appointment={a}
                  onClick={() => setSelected(a)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {selected ? (
        <AppointmentDetailDialog
          appointment={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      ) : null}
    </>
  );
}

function AppointmentBlock({
  appointment,
  onClick,
}: {
  appointment: CalendarAppointment;
  onClick: () => void;
}) {
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const startMinutes =
    (start.getHours() - CALENDAR_DAY_START_HOUR) * 60 + start.getMinutes();
  const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / 60000);
  const top = (startMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const rawHeight = (durationMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const renderedHeight = Math.max(28, rawHeight - 2);
  const compact = renderedHeight < COMPACT_BLOCK_THRESHOLD_PX;

  const tone = blockTone(appointment.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1.5 text-left text-xs leading-tight shadow-sm transition-colors",
        tone,
      )}
      style={{ top, height: renderedHeight }}
      aria-label={`${appointment.patientName} with ${appointment.dentistName} at ${formatTime(start)}`}
    >
      <p className="truncate font-medium leading-tight">{appointment.patientName}</p>
      {!compact ? (
        <p className="truncate text-[10px] leading-tight opacity-80">
          {formatTime(start)} · {appointment.dentistName}
        </p>
      ) : null}
      {!compact && appointment.status !== "SCHEDULED" ? (
        <p className="mt-0.5 truncate text-[10px] uppercase leading-tight opacity-80">
          {APPOINTMENT_STATUS_LABELS[appointment.status]}
        </p>
      ) : null}
    </button>
  );
}

function blockTone(status: AppointmentStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100";
    case "CONFIRMED":
      return "border-blue-300 bg-blue-100 text-blue-950 hover:bg-blue-200 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100";
    case "COMPLETED":
      return "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100";
    case "CANCELLED":
      return "border-zinc-300 bg-zinc-100 text-zinc-600 line-through hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400";
    case "NO_SHOW":
      return "border-rose-300 bg-rose-100 text-rose-950 hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-100";
  }
}

function formatHourLabel(hour: number): string {
  const am = hour < 12;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${am ? "AM" : "PM"}`;
}

// Re-export the badge for use in detail dialog without opening a separate file.
export { AppointmentStatusBadge };
