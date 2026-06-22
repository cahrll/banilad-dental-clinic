"use client";

import { useEffect, useState } from "react";
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

const HOUR_HEIGHT_PX = 72;
const SLOT_MINUTES = 60;
const LANE_GAP_PX = 2;
const COMPACT_BLOCK_THRESHOLD_PX = 44;

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
  multiDentist,
}: {
  days: Date[];
  selectedDay: Date;
  endHour: number;
  appointments: CalendarAppointment[];
  multiDentist: boolean;
}) {
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const totalHours = endHour - CALENDAR_DAY_START_HOUR;

  return (
    <>
      <div className="hidden md:block">
        <WeekView
          days={days}
          totalHours={totalHours}
          appointments={appointments}
          multiDentist={multiDentist}
          now={now}
          onSelect={setSelected}
        />
      </div>
      <div className="md:hidden">
        <DayView
          day={selectedDay}
          totalHours={totalHours}
          appointments={appointments}
          multiDentist={multiDentist}
          now={now}
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
  multiDentist,
  now,
  onSelect,
}: {
  days: Date[];
  totalHours: number;
  appointments: CalendarAppointment[];
  multiDentist: boolean;
  now: Date | null;
  onSelect: (a: CalendarAppointment) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border text-xs">
        <div className="border-r border-border bg-muted/40" />
        {days.map((d) => {
          const { weekday, dayMonth } = formatDayHeader(d);
          const today = now ? isSameDay(d, now) : false;
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "flex flex-col items-center gap-0.5 border-r border-border py-2 last:border-r-0",
                today && "bg-primary/8",
              )}
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {weekday}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  today && "text-primary",
                )}
              >
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
            multiDentist={multiDentist}
            now={now}
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
  multiDentist,
  now,
  onSelect,
}: {
  day: Date;
  totalHours: number;
  appointments: CalendarAppointment[];
  multiDentist: boolean;
  now: Date | null;
  onSelect: (a: CalendarAppointment) => void;
}) {
  const { weekday, dayMonth } = formatDayHeader(day);
  const today = now ? isSameDay(day, now) : false;
  return (
    <>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] border-b border-border text-xs">
        <div className="border-r border-border bg-muted/40" />
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 py-2",
            today && "bg-primary/8",
          )}
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {weekday}
          </span>
          <span
            className={cn(
              "text-sm font-medium",
              today && "text-primary",
            )}
          >
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
          multiDentist={multiDentist}
          now={now}
          onSelect={onSelect}
        />
      </div>
    </>
  );
}

function HourGutter({ totalHours }: { totalHours: number }) {
  return (
    <div className="border-r border-border bg-muted/40">
      {Array.from({ length: totalHours }).map((_, i) => {
        const hour = CALENDAR_DAY_START_HOUR + i;
        return (
          <div
            key={hour}
            data-tabular
            className="flex items-start justify-end px-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums"
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
  multiDentist,
  now,
  onSelect,
}: {
  day: Date;
  totalHours: number;
  appointments: CalendarAppointment[];
  multiDentist: boolean;
  now: Date | null;
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

  
  const isToday = now ? isSameDay(day, now) : false;
  const nowTop = (() => {
    if (!now || !isToday) return null;
    const minutes = (now.getHours() - CALENDAR_DAY_START_HOUR) * 60 + now.getMinutes();
    if (minutes < 0 || minutes > totalHours * 60) return null;
    return (minutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  })();

  return (
    <div
      className="relative border-r border-border last:border-r-0"
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
          multiDentist={multiDentist}
          now={now}
          onClick={() => onSelect(e.appointment)}
        />
      ))}

      {nowTop != null ? (
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 left-0 z-10 h-px bg-primary"
          style={{ top: nowTop }}
        />
      ) : null}
    </div>
  );
}

function AppointmentBlock({
  appointment,
  start,
  end,
  lane,
  lanes,
  multiDentist,
  now,
  onClick,
}: {
  appointment: CalendarAppointment;
  start: Date;
  end: Date;
  lane: number;
  lanes: number;
  multiDentist: boolean;
  now: Date | null;
  onClick: () => void;
}) {
  const startMinutes =
    (start.getHours() - CALENDAR_DAY_START_HOUR) * 60 + start.getMinutes();
  const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / 60000);
  const top = (startMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const rawHeight = (durationMinutes / SLOT_MINUTES) * HOUR_HEIGHT_PX;
  const renderedHeight = Math.max(28, rawHeight - 2);
  const tier = renderTier(durationMinutes, lanes);
  const compact = renderedHeight < COMPACT_BLOCK_THRESHOLD_PX;

  // Is this block live right now? Drives cobalt override + NOW tag.
  const isNow =
    now != null &&
    now.getTime() >= start.getTime() &&
    now.getTime() < end.getTime();

  const tone = isNow ? NOW_TONE : blockTone(appointment.status);
  const widthPct = 100 / lanes;
  const leftPct = lane * widthPct;
  const positionStyle: React.CSSProperties = {
    top,
    height: renderedHeight,
    left: `calc(${leftPct}% + 4px)`,
    width: `calc(${widthPct}% - ${LANE_GAP_PX + 4}px)`,
  };

  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];
  const showTimeLine =
    !compact && (tier === "narrow" || tier === "short" || tier === "full");
  const showDentist = !compact && (tier === "short" || tier === "full");
  const showStatus =
    !compact &&
    (tier === "short" || tier === "full") &&
    appointment.status !== "SCHEDULED" &&
    !isNow;

  const showInitialsChip = multiDentist && !isNow && tier !== "veryNarrow";

  const tooltip = `${appointment.patientName} · ${formatTime(start)}${
    end ? ` – ${formatTime(end)}` : ""
  } · ${appointment.dentistName} · ${isNow ? "NOW · " : ""}${statusLabel}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={cn(
        "absolute overflow-hidden border px-2 py-1.5 text-left text-xs leading-tight transition-colors",
        tone,
      )}
      style={positionStyle}
      aria-label={`${appointment.patientName} with ${appointment.dentistName} at ${formatTime(start)}`}
    >
      <p className="flex items-center gap-1 truncate font-medium leading-tight">
        {isNow ? (
          <span
            aria-hidden
            className="inline-block bg-primary-foreground/20 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-primary-foreground"
          >
            Now
          </span>
        ) : null}
        <span className="truncate">{appointment.patientName}</span>
      </p>
      {showTimeLine ? (
        <p
          data-tabular
          className="truncate font-mono text-[10px] leading-tight tabular-nums opacity-80"
        >
          {formatTime(start)}
          {showDentist ? ` · ${appointment.dentistName}` : ""}
        </p>
      ) : null}
      {showStatus ? (
        <p className="mt-0.5 truncate font-mono text-[10px] uppercase leading-tight tracking-wider opacity-80">
          {statusLabel}
        </p>
      ) : null}
      {showInitialsChip ? (
        <span
          aria-hidden
          data-tabular
          title={appointment.dentistName}
          className="absolute top-1 right-1 inline-flex items-center justify-center border border-border bg-background px-1 py-px font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
        >
          {dentistInitials(appointment.dentistName)}
        </span>
      ) : null}
    </button>
  );
}

const NOW_TONE = "border-primary bg-primary text-primary-foreground hover:bg-primary/90";

function blockTone(status: AppointmentStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "border-warning/40 bg-warning/15 text-warning hover:bg-warning/25";
    case "CONFIRMED":
      return "border-info/50 bg-info/30 text-info hover:bg-info/40";
    case "COMPLETED":
      return "border-success/40 bg-success/15 text-success hover:bg-success/25";
    case "CANCELLED":
      return "border-border bg-muted text-muted-foreground line-through hover:bg-muted/80";
    case "NO_SHOW":
      return "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25";
  }
}

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}


function dentistInitials(name: string): string {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter((t) => !/^dr\.?$/i.test(t));
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (
    (tokens[0][0] ?? "") + (tokens[tokens.length - 1][0] ?? "")
  ).toUpperCase();
}

// Re-export the badge for use in detail dialog without opening a separate file.
export { AppointmentStatusBadge };
