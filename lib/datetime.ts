import {
  addDays,
  addMinutes,
  endOfDay,
  format,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const CALENDAR_DAY_START_HOUR = 8;
export const CALENDAR_DAY_END_HOUR = 18;
export const CALENDAR_SLOT_MINUTES = 30;

export function weekStart(date: Date): Date {
  // Monday-first week.
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function weekDays(weekStartDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
}

export function dayHourSlots(day: Date): Date[] {
  const slots: Date[] = [];
  const base = setMinutes(setHours(startOfDay(day), CALENDAR_DAY_START_HOUR), 0);
  const totalMinutes = (CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR) * 60;
  for (let m = 0; m < totalMinutes; m += CALENDAR_SLOT_MINUTES) {
    slots.push(addMinutes(base, m));
  }
  return slots;
}

export function rangeForWeek(date: Date): { start: Date; end: Date } {
  const start = weekStart(date);
  const end = endOfDay(addDays(start, 6));
  return { start, end };
}

export function isoDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isoDatetimeLocal(date: Date): string {
  // Produces yyyy-MM-ddTHH:mm in *local* time, suitable for <input type="datetime-local">.
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function formatDayHeader(day: Date): { weekday: string; dayMonth: string } {
  return {
    weekday: format(day, "EEE"),
    dayMonth: format(day, "MMM d"),
  };
}

export function formatTime(d: Date): string {
  return format(d, "h:mm a");
}

export function formatDateTime(d: Date): string {
  return format(d, "EEE, MMM d · h:mm a");
}

export function formatDateLong(d: Date): string {
  return format(d, "EEEE, MMMM d, yyyy");
}

export { isSameDay, addDays };
