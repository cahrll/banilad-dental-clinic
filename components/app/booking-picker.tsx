"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, startOfDay, startOfMonth } from "date-fns";
import { CalendarClock, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateLong, formatTime } from "@/lib/datetime";

type Dentist = { id: string; name: string };

type Slot = { startsAt: Date; endsAt: Date; dentistId: string };

type AvailabilityDay = { date: string; slots: Slot[] };

export type BookingSelection = {
  startsAt: Date;
  endsAt: Date;
  dentistId: string;
};

export type BookingPickerProps = {
  mode: "patient" | "staff";
  dentists: Dentist[];
  durationMinutes: number;
  excludeAppointmentId?: string;
  initialStart?: Date;
  refreshKey?: number;
  onChange: (value: BookingSelection | null) => void;
};

const PATIENT_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

function ymd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function slotKey(s: { startsAt: Date; dentistId: string }): string {
  return `${s.startsAt.getTime()}|${s.dentistId}`;
}

export function BookingPicker({
  mode,
  dentists,
  durationMinutes,
  excludeAppointmentId,
  initialStart,
  refreshKey,
  onChange,
}: BookingPickerProps) {
  const dentistIdsKey = useMemo(
    () =>
      [...dentists.map((d) => d.id)]
        .sort((a, b) => a.localeCompare(b))
        .join(","),
    [dentists],
  );
  const dentistNameById = useMemo(
    () => new Map(dentists.map((d) => [d.id, d.name])),
    [dentists],
  );

  const [month, setMonth] = useState<Date>(() =>
    startOfMonth(initialStart ?? new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialStart ? startOfDay(initialStart) : undefined,
  );
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    initialStart && dentists[0]
      ? slotKey({ startsAt: initialStart, dentistId: dentists[0].id })
      : undefined,
  );

  const [monthData, setMonthData] = useState<AvailabilityDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot "now" once at mount. Server is authoritative for lead-time anyway,
  // and dialog sessions are short; refreshing this on every render is impure.
  const [today] = useState(() => startOfDay(new Date()));
  const [leadTimeFloor] = useState(() => Date.now() + PATIENT_LEAD_TIME_MS);

  useEffect(() => {
    if (dentists.length === 0 || durationMinutes <= 0) return;

    const from = startOfMonth(month);
    const to = startOfMonth(addMonths(month, 1));
    const params = new URLSearchParams({
      dentistIds: dentists.map((d) => d.id).join(","),
      durationMinutes: String(durationMinutes),
      from: from.toISOString(),
      to: to.toISOString(),
    });
    if (excludeAppointmentId) params.set("excludeAppointmentId", excludeAppointmentId);

    const controller = new AbortController();
    // The async fetch synchronizes month state with the server. Setting
    // transient loading/error/data state here is the right primitive.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true);
    setError(null);
    setMonthData(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`/api/availability?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("availability fetch failed");
        const json = (await r.json()) as {
          days: {
            date: string;
            slots: { startsAt: string; endsAt: string; dentistId: string }[];
          }[];
        };
        const parsed: AvailabilityDay[] = json.days.map((d) => ({
          date: d.date,
          slots: d.slots.map((s) => ({
            startsAt: new Date(s.startsAt),
            endsAt: new Date(s.endsAt),
            dentistId: s.dentistId,
          })),
        }));
        setMonthData(parsed);
      })
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setError("Couldn't load availability.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [
    dentistIdsKey,
    dentists,
    durationMinutes,
    excludeAppointmentId,
    month,
    refreshKey,
  ]);

  const dayInfo = useMemo(() => {
    const opens = new Set<string>();
    const counts = new Map<string, number>();
    if (!monthData) return { opens, counts };
    for (const d of monthData) {
      const usable =
        mode === "patient"
          ? d.slots.filter((s) => s.startsAt.getTime() >= leadTimeFloor)
          : d.slots;
      if (usable.length > 0) {
        opens.add(d.date);
        counts.set(d.date, usable.length);
      }
    }
    return { opens, counts };
  }, [monthData, mode, leadTimeFloor]);

  const selectedDaySlots = useMemo<Slot[]>(() => {
    if (!selectedDate || !monthData) return [];
    const key = ymd(selectedDate);
    const day = monthData.find((d) => d.date === key);
    return day?.slots ?? [];
  }, [selectedDate, monthData]);

  function handleDaySelect(d: Date | undefined) {
    if (!d) {
      setSelectedDate(undefined);
      setSelectedKey(undefined);
      onChange(null);
      return;
    }
    setSelectedDate(startOfDay(d));
    if (selectedKey) {
      setSelectedKey(undefined);
      onChange(null);
    }
  }

  function handleSlotSelect(slot: Slot) {
    const key = slotKey(slot);
    setSelectedKey(key);
    onChange({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      dentistId: slot.dentistId,
    });
  }

  // Disable: past days, Sundays. Other "no openings" days stay enabled but show
  // an empty slot column — that way the user gets feedback rather than a
  // silently-disabled cell.
  const disabledMatcher = (d: Date) => {
    if (d < today) return true;
    if (d.getDay() === 0) return true;
    return false;
  };

  const dotClass =
    "[&>button]:after:content-[''] [&>button]:after:absolute [&>button]:after:left-1/2 [&>button]:after:bottom-1 [&>button]:after:-translate-x-1/2 [&>button]:after:size-1 [&>button]:after:rounded-full [&>button]:after:bg-primary [&>button[data-selected-single=true]]:after:bg-primary-foreground";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
      <div className="rounded-md border bg-card">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          month={month}
          onMonthChange={setMonth}
          disabled={disabledMatcher}
          modifiers={{
            hasOpenings: (d) => dayInfo.opens.has(ymd(d)),
          }}
          modifiersClassNames={{
            hasOpenings: dotClass,
          }}
        />
      </div>

      <div className="flex min-h-64 flex-col gap-3" aria-live="polite">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {selectedDate ? formatDateLong(selectedDate) : "Pick a day"}
          </p>
          {selectedDate && !loading && monthData ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {dayInfo.counts.get(ymd(selectedDate)) ?? 0} open
            </p>
          ) : null}
        </div>

        {error ? (
          <SlotError message={error} />
        ) : loading ? (
          <SlotSkeleton />
        ) : !selectedDate ? (
          <SlotEmpty
            icon={<CalendarClock className="size-4" aria-hidden />}
            title="Select a date to see available times"
          />
        ) : selectedDaySlots.length === 0 ? (
          <SlotEmpty
            icon={<Info className="size-4" aria-hidden />}
            title="No available times on this day."
            body="Try another day."
          />
        ) : (
          <SlotPills
            mode={mode}
            slots={selectedDaySlots}
            selectedKey={selectedKey}
            onSelect={handleSlotSelect}
            dentistNameById={dentistNameById}
            leadTimeFloor={leadTimeFloor}
          />
        )}
      </div>
    </div>
  );
}

function SlotPills({
  mode,
  slots,
  selectedKey,
  onSelect,
  dentistNameById,
  leadTimeFloor,
}: {
  mode: "patient" | "staff";
  slots: Slot[];
  selectedKey: string | undefined;
  onSelect: (slot: Slot) => void;
  dentistNameById: Map<string, string>;
  leadTimeFloor: number;
}) {
  const showDentist = mode === "staff" && dentistNameById.size > 1;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const key = slotKey(slot);
        const isSelected = selectedKey === key;
        const tooSoon =
          mode === "patient" && slot.startsAt.getTime() < leadTimeFloor;
        const dentistName = dentistNameById.get(slot.dentistId);
        const ariaLabel = `${formatTime(slot.startsAt)}${dentistName ? ` with ${dentistName}` : ""}${tooSoon ? " — too soon to book" : ""}`;

        const button = (
          <Button
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={tooSoon}
            aria-pressed={isSelected}
            aria-label={ariaLabel}
            className={cn(
              "h-auto w-full flex-col items-center gap-0.5 py-2 tabular-nums",
              mode === "patient" && "min-h-11",
              !isSelected && "border-border",
            )}
            onClick={() => onSelect(slot)}
          >
            <span className="font-mono">{formatTime(slot.startsAt)}</span>
            {showDentist && dentistName ? (
              <span
                className={cn(
                  "text-[10px] font-normal",
                  isSelected
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {dentistName}
              </span>
            ) : null}
          </Button>
        );

        if (tooSoon) {
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-block w-full">
                  {button}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Patients must book at least 2 hours ahead.
              </TooltipContent>
            </Tooltip>
          );
        }

        return <div key={key}>{button}</div>;
      })}
    </div>
  );
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function SlotEmpty({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-6 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {body ? <p className="text-xs text-muted-foreground">{body}</p> : null}
    </div>
  );
}

function SlotError({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p className="text-sm text-destructive">{message}</p>
      <p className="text-xs text-muted-foreground">
        Try again, or close and reopen this dialog.
      </p>
    </div>
  );
}
