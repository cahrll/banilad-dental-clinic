"use client";

import { useState } from "react";
import { isSameDay } from "date-fns";
import {
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
import { assignLanes, type LaneLayout } from "@/lib/calendar-layout";
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

type LaidOutAppointment = LaneLayout<{
  id: string;
  startsAt: Date;
  endsAt: Date;
  appointment: CalendarAppointment;
}>;

const HOUR_HEIGHT_PX = 72; // each hour row — sized for 2-3 lines of card text
const SLOT_MINUTES = 60;
const LANE_GAP_PX = 2;

type RenderTier = "veryNarrow" | "narrow" | "short" | "full";

function renderTier(durationMinutes: number, lanes: number): RenderTier {
  if (lanes >= 3) return "veryNarrow";
  if (lanes === 2 && durationMinutes <= 15) return "veryNarrow";
  if (lanes === 2) return "narrow";
  if (durationMinutes <= 30) return "short";
  return "full";
}

export function WeekGrid({
  days,
  selectedDay,
  endHour,
  appointments,
  dentistHueByDentistId,
}: {
  days: Date[];
  selectedDay: Date;
  endHour: number;
  appointments: CalendarAppointment[];
  dentistHueByDentistId: Record<string, number> | null;
}) {
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const totalHours = endHour - CALENDAR_DAY_START_HOUR;

  return (
    <>
      <div className="hidden md:block">
        <WeekView
          days={days}
          totalHours={totalHours}
          appointments={appointments}
          dentistHueByDentistId={dentistHueByDentistId}
          onSelect={setSelected}
        />
      </div>
      <div className="md:hidden">
        <DayView
          day={selectedDay}
          totalHours={totalHours}
          appointments={appointments}
          dentistHueByDentistId={dentistHueByDentistId}
          onSelect={setSelected}
        />
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

function WeekView({
  days,
  totalHours,
  appointments,
  dentistHueByDentistId,
  onSelect,
}: {
  days: Date[];
  totalHours: number;
  appointments: CalendarAppointment[];
  dentistHueByDentistId: Record<string, number> | null;
  onSelect: (a: CalendarAppointment) => void;
}) {
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
        <HourGutter totalHours={totalHours} />
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            totalHours={totalHours}
            appointments={appointments}
            dentistHueByDentistId={dentistHueByDentistId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}

function DayView({
  day,
  totalHours,
  appointments,
  dentistHueByDentistId,
  onSelect,
}: {
  day: Date;
  totalHours: number;
  appointments: CalendarAppointment[];
  dentistHueByDentistId: Record<string, number> | null;
  onSelect: (a: CalendarAppointment) => void;
}) {
  const { weekday, dayMonth } = formatDayHeader(day);
  const today = isSameDay(day, new Date());
  return (
    <>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] border-b text-xs">
        <div className="border-r bg-muted/40" />
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 py-2",
            today && "bg-primary/5",
          )}
        >
          <span className="text-muted-foreground">{weekday}</span>
          <span className={cn("text-sm font-medium", today && "text-primary")}>
            {dayMonth}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[64px_minmax(0,1fr)]">
        <HourGutter totalHours={totalHours} />
        <DayColumn
          day={day}
          totalHours={totalHours}
          appointments={appointments}
          dentistHueByDentistId={dentistHueByDentistId}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}

function HourGutter({ totalHours }: { totalHours: number }) {
  return (
    <div className="border-r bg-muted/40">
      {Array.from({ length: totalHours }).map((_, i) => {
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
  );
}

function DayColumn({
  day,
  totalHours,
  appointments,
  dentistHueByDentistId,
  onSelect,
}: {
  day: Date;
  totalHours: number;
  appointments: CalendarAppointment[];
  dentistHueByDentistId: Record<string, number> | null;
  onSelect: (a: CalendarAppointment) => void;
}) {
  const dayAppts = appointments.filter((a) =>
    isSameDay(new Date(a.startsAt), day),
  );

  const laidOut: LaidOutAppointment[] = assignLanes(
    dayAppts.map((a) => ({
      id: a.id,
      startsAt: new Date(a.startsAt),
      endsAt: new Date(a.endsAt),
      appointment: a,
    })),
  );

  return (
    <div
      className="relative border-r last:border-r-0"
      style={{ height: HOUR_HEIGHT_PX * totalHours }}
    >
      {Array.from({ length: totalHours }).map((_, i) => (
        <div
          key={i}
          className="border-b border-dashed border-border/60 last:border-b-0"
          style={{ height: HOUR_HEIGHT_PX }}
        />
      ))}
      {laidOut.map((e) => (
        <AppointmentBlock
          key={e.id}
          appointment={e.appointment}
          start={e.startsAt}
          end={e.endsAt}
          lane={e.lane}
          lanes={e.lanes}
          dentistHueIndex={
            dentistHueByDentistId
              ? (dentistHueByDentistId[e.appointment.dentistId] ?? null)
              : null
          }
          onClick={() => onSelect(e.appointment)}
        />
      ))}
    </div>
  );
}

function AppointmentBlock({
  appointment,
  start,
  end,
  lane,
  lanes,
  dentistHueIndex,
  onClick,
}: {
  appointment: CalendarAppointment;
  start: Date;
  end: Date;
  lane: number;
  lanes: number;
  dentistHueIndex: number | null;
  onClick: () => void;
}) {
  const startMinutes =
    (start.getHours() - CALENDAR_DAY_START_HOUR) * 60 + start.getMinutes();
  const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / 60000);
  const top = (startMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const rawHeight = (durationMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const renderedHeight = Math.max(28, rawHeight - 2);
  const tier = renderTier(durationMinutes, lanes);

  const tone = blockTone(appointment.status);
  const widthPct = 100 / lanes;
  const leftPct = lane * widthPct;
  const positionStyle: React.CSSProperties = {
    top,
    height: renderedHeight,
    left: `calc(${leftPct}% + 4px)`,
    width: `calc(${widthPct}% - ${LANE_GAP_PX + 4}px)`,
  };
  const hueVar =
    dentistHueIndex != null ? `var(--chart-${dentistHueIndex})` : null;

  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
  const showTimeLine = tier === "narrow" || tier === "short" || tier === "full";
  const showDentist = tier === "short" || tier === "full";
  const showStatus =
    (tier === "short" || tier === "full") && appointment.status !== "SCHEDULED";

  const tooltip = `${appointment.patientName} · ${formatTime(start)}${
    end ? ` – ${formatTime(end)}` : ""
  } · ${appointment.dentistName} · ${statusLabel}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={cn(
        "absolute overflow-hidden rounded-md border px-2 py-1.5 text-left text-xs leading-tight shadow-sm transition-colors",
        tone,
        hueVar && "border-l-[3px]",
      )}
      style={
        hueVar
          ? { ...positionStyle, borderLeftColor: hueVar }
          : positionStyle
      }
      aria-label={`${appointment.patientName} with ${appointment.dentistName} at ${formatTime(start)}`}
    >
      <p className="flex items-center gap-1 truncate font-medium leading-tight">
        {hueVar ? (
          <span
            aria-hidden
            className="inline-block size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: hueVar }}
          />
        ) : null}
        <span className="truncate">{appointment.patientName}</span>
      </p>
      {showTimeLine ? (
        <p className="truncate text-[10px] leading-tight opacity-80">
          {formatTime(start)}
          {showDentist ? ` · ${appointment.dentistName}` : ""}
        </p>
      ) : null}
      {showStatus ? (
        <p className="mt-0.5 truncate text-[10px] uppercase leading-tight opacity-80">
          {statusLabel}
        </p>
      ) : null}
    </button>
  );
}

function blockTone(status: AppointmentStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "border-warning/40 bg-warning/15 text-warning hover:bg-warning/25";
    case "CONFIRMED":
      return "border-info/40 bg-info/15 text-info hover:bg-info/25";
    case "COMPLETED":
      return "border-success/40 bg-success/15 text-success hover:bg-success/25";
    case "CANCELLED":
      return "border-border bg-muted text-muted-foreground line-through hover:bg-muted/80";
    case "NO_SHOW":
      return "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25";
  }
}

function formatHourLabel(hour: number): string {
  const am = hour < 12;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${am ? "AM" : "PM"}`;
}

// Re-export the badge for use in detail dialog without opening a separate file.
export { AppointmentStatusBadge };
