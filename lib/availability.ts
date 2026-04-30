import { addDays, format, setHours, setMinutes, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

// Two intervals [aStart, aEnd) and [bStart, bEnd) overlap iff aStart < bEnd && bStart < aEnd.
// In Prisma terms for `dentistId, startsAt, endsAt`:
//   AND: [{ startsAt: { lt: end } }, { endsAt: { gt: start } }]
// Excludes CANCELLED + NO_SHOW since those slots are free.

export async function dentistHasConflict(opts: {
  dentistId: string;
  start: Date;
  end: Date;
  excludeAppointmentId?: string;
}): Promise<boolean> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      dentistId: opts.dentistId,
      status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      startsAt: { lt: opts.end },
      endsAt: { gt: opts.start },
      ...(opts.excludeAppointmentId ? { NOT: { id: opts.excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });
  return !!conflict;
}

// ----- Clinic hours (constant; per-dentist override via Dentist.workingHours is a future phase) -----

type HourWindow = readonly [string, string]; // ["HH:mm", "HH:mm"]

export const CLINIC_HOURS: {
  weekday: HourWindow[];
  saturday: HourWindow[];
  sunday: HourWindow[];
} = {
  weekday: [
    ["09:00", "12:00"],
    ["13:00", "17:00"],
  ],
  saturday: [
    ["09:00", "12:00"],
    ["13:00", "17:00"],
  ],
  sunday: [],
};

function windowsForDay(day: Date): HourWindow[] {
  const dow = day.getDay(); // 0 Sun … 6 Sat
  if (dow === 0) return CLINIC_HOURS.sunday;
  if (dow === 6) return CLINIC_HOURS.saturday;
  return CLINIC_HOURS.weekday;
}

function setHHMM(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return setMinutes(setHours(startOfDay(day), h), m);
}

function localYMD(day: Date): string {
  return format(day, "yyyy-MM-dd");
}

// ----- Availability engine -----

export type AvailabilitySlot = {
  startsAt: Date;
  endsAt: Date;
  dentistId: string;
};

export type AvailabilityDay = {
  date: string; // yyyy-MM-dd in clinic-local time
  slots: AvailabilitySlot[];
};

type Interval = { start: number; end: number };

function overlapsAny(busy: Interval[], start: number, end: number): boolean {
  for (const b of busy) {
    if (b.start < end && b.end > start) return true;
  }
  return false;
}

export async function getAvailableSlots(opts: {
  dentistIds: string[];
  durationMinutes: number;
  from: Date; // inclusive (start of first day, local)
  to: Date; // exclusive (start of day AFTER last day, local)
  excludeAppointmentId?: string;
}): Promise<AvailabilityDay[]> {
  const { dentistIds, durationMinutes, from, to, excludeAppointmentId } = opts;

  if (dentistIds.length === 0 || durationMinutes <= 0 || from >= to) return [];

  const busy = await prisma.appointment.findMany({
    where: {
      dentistId: { in: dentistIds },
      status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
    },
    select: { dentistId: true, startsAt: true, endsAt: true },
  });

  // Group busy intervals by yyyy-MM-dd × dentistId. Split appointments that
  // straddle midnight (max 8h per validator, so at most one boundary).
  const busyByDay = new Map<string, Map<string, Interval[]>>();
  for (const b of busy) {
    let cursor = new Date(b.startsAt);
    const stop = new Date(b.endsAt);
    while (cursor < stop) {
      const dayKey = localYMD(cursor);
      const nextMidnight = startOfDay(addDays(cursor, 1));
      const segEnd = stop < nextMidnight ? stop : nextMidnight;

      let perDentist = busyByDay.get(dayKey);
      if (!perDentist) {
        perDentist = new Map();
        busyByDay.set(dayKey, perDentist);
      }
      let list = perDentist.get(b.dentistId);
      if (!list) {
        list = [];
        perDentist.set(b.dentistId, list);
      }
      list.push({ start: cursor.getTime(), end: segEnd.getTime() });
      cursor = segEnd;
    }
  }

  const stepMs = durationMinutes * 60 * 1000;
  const result: AvailabilityDay[] = [];

  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    const dayKey = localYMD(day);
    const windows = windowsForDay(day);
    const slots: AvailabilitySlot[] = [];

    if (windows.length > 0) {
      const perDentist = busyByDay.get(dayKey);
      for (const dentistId of dentistIds) {
        const busyList = perDentist?.get(dentistId) ?? [];
        for (const [hhStart, hhEnd] of windows) {
          const winStart = setHHMM(day, hhStart).getTime();
          const winEnd = setHHMM(day, hhEnd).getTime();
          for (let t = winStart; t + stepMs <= winEnd; t += stepMs) {
            const slotEnd = t + stepMs;
            if (!overlapsAny(busyList, t, slotEnd)) {
              slots.push({
                startsAt: new Date(t),
                endsAt: new Date(slotEnd),
                dentistId,
              });
            }
          }
        }
      }
      slots.sort((a, b) => {
        const d = a.startsAt.getTime() - b.startsAt.getTime();
        return d !== 0 ? d : a.dentistId.localeCompare(b.dentistId);
      });
    }

    result.push({ date: dayKey, slots });
  }

  return result;
}
