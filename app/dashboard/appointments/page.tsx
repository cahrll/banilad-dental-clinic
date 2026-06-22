import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  LaneKey,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  CALENDAR_DAY_END_HOUR,
  isoDateInput,
  rangeForWeek,
  weekDays,
  weekStart,
} from "@/lib/datetime";
import { WeekGrid } from "./week-grid";
import { DentistFilter } from "./dentist-filter";

export const metadata = { title: "Appointments · Banilad Dental Clinic" };

type SearchParams = { week?: string; date?: string; dentistId?: string };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { week, date, dentistId } = await searchParams;

  const dayCursor = date ? new Date(`${date}T00:00:00`) : new Date();
  const weekCursor = week
    ? new Date(`${week}T00:00:00`)
    : date
      ? dayCursor
      : new Date();

  const start = weekStart(weekCursor);
  const days = weekDays(start);
  const { start: weekRangeStart, end: weekRangeEnd } = rangeForWeek(start);

  const selectedDay = date ? dayCursor : new Date();
  const dayRangeStart = startOfDay(selectedDay);
  const dayRangeEnd = endOfDay(selectedDay);

  const fetchStart =
    dayRangeStart < weekRangeStart ? dayRangeStart : weekRangeStart;
  const fetchEnd = dayRangeEnd > weekRangeEnd ? dayRangeEnd : weekRangeEnd;

  const [dentists, appointments] = await Promise.all([
    prisma.dentist.findMany({
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: fetchStart, lte: fetchEnd },
        ...(dentistId ? { dentistId } : {}),
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        reason: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
        dentist: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
    }),
  ]);


  const latestEndHour = appointments.reduce((max, a) => {
    const end = a.endsAt;
    const hour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
    return hour > max ? hour : max;
  }, CALENDAR_DAY_END_HOUR);
  const effectiveEndHour = Math.min(24, Math.max(CALENDAR_DAY_END_HOUR, latestEndHour));


  const weekPrev = appendQuery({
    week: isoDateInput(addDays(start, -7)),
    dentistId,
  });
  const weekNext = appendQuery({
    week: isoDateInput(addDays(start, 7)),
    dentistId,
  });
  const weekToday = appendQuery({ dentistId });

  const dayPrev = appendQuery({
    date: isoDateInput(addDays(selectedDay, -1)),
    dentistId,
  });
  const dayNext = appendQuery({
    date: isoDateInput(addDays(selectedDay, 1)),
    dentistId,
  });
  const dayToday = appendQuery({ dentistId });

  const weekIso = isoDateInput(start);
  const selectedDentist =
    dentistId && dentists.find((d) => d.id === dentistId)?.user.name;

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        crumb={`/ appointments / week-of ${weekIso}${selectedDentist ? ` / ${selectedDentist.toLowerCase()}` : ""}`}
        title="Schedule"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 md:flex">
              <StrideButton href={weekPrev} ariaLabel="Previous week">
                <ChevronLeft aria-hidden />
              </StrideButton>
              <StrideButton href={weekToday}>Today</StrideButton>
              <StrideButton href={weekNext} ariaLabel="Next week">
                <ChevronRight aria-hidden />
              </StrideButton>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <StrideButton href={dayPrev} ariaLabel="Previous day">
                <ChevronLeft aria-hidden />
              </StrideButton>
              <StrideButton href={dayToday}>Today</StrideButton>
              <StrideButton href={dayNext} ariaLabel="Next day">
                <ChevronRight aria-hidden />
              </StrideButton>
            </div>
            <DentistFilter
              dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
              selected={dentistId}
            />
            <Button
              asChild
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/dashboard/appointments/new">
                <Plus aria-hidden /> Appointment
              </Link>
            </Button>
          </div>
        }
      />

      <LaneKey
        items={[
          { label: "Scheduled", dotClass: "bg-warning" },
          { label: "Confirmed", dotClass: "bg-info" },
          { label: "Completed", dotClass: "bg-success" },
          { label: "Cancelled", dotClass: "bg-muted-foreground/60" },
          { label: "No-show", dotClass: "bg-destructive" },
        ]}
      />

      <div className="border border-border bg-card">
        <WeekGrid
          days={days}
          selectedDay={selectedDay}
          endHour={effectiveEndHour}
          multiDentist={!dentistId}
          appointments={appointments.map((a) => ({
            id: a.id,
            startsAt: a.startsAt.toISOString(),
            endsAt: a.endsAt.toISOString(),
            status: a.status,
            reason: a.reason,
            patientId: a.patient.id,
            patientName: `${a.patient.firstName} ${a.patient.lastName}`,
            dentistId: a.dentist.id,
            dentistName: a.dentist.user.name,
          }))}
        />
      </div>

      <Plate
        left={`Schedule · week of ${weekIso}`}
        right={`${appointments.length} ${appointments.length === 1 ? "appointment" : "appointments"} in view`}
      />
    </div>
  );
}

function StrideButton({
  href,
  children,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-8 px-2.5 font-mono text-[11px] uppercase tracking-wider"
    >
      <Link href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    </Button>
  );
}

function appendQuery(parts: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "?";
}
