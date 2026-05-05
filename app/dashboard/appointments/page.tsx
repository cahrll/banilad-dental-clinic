import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  formatDateLong,
  isoDateInput,
  rangeForWeek,
  weekDays,
  weekStart,
} from "@/lib/datetime";
import { WeekGrid } from "./week-grid";
import { DentistFilter } from "./dentist-filter";

export const metadata = { title: "Appointments · Banilad Dental Clinic" };

type SearchParams = { week?: string; date?: string; dentistId?: string };

const HUE_COUNT = 5;

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

  // Fetch the union of both ranges so the same payload feeds both views
  // (CSS picks which view renders, no JS branching during render).
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

  // Hue map only matters in combined view — when filtered to one dentist,
  // the colour is redundant. Sorted dentist order keeps the assignment stable.
  const dentistHueByDentistId = dentistId
    ? null
    : Object.fromEntries(
        dentists.map((d, i) => [d.id, (i % HUE_COUNT) + 1]),
      );

  // Prev/Today/Next render two link sets (week-stride for ≥md, day-stride for <md);
  // CSS hides the inactive one so semantics follow the visible view.
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description={`Week of ${formatDateLong(start)}`}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/appointments/new">
              <Plus aria-hidden /> New appointment
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="outline" size="sm">
            <Link href={weekPrev}>
              <ChevronLeft aria-hidden /> Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={weekToday}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={weekNext}>
              Next <ChevronRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="outline" size="sm">
            <Link href={dayPrev}>
              <ChevronLeft aria-hidden /> Prev
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={dayToday}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={dayNext}>
              Next <ChevronRight aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="ms-auto">
          <DentistFilter
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            selected={dentistId}
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0 gap-0">
        <WeekGrid
          days={days}
          selectedDay={selectedDay}
          dentistHueByDentistId={dentistHueByDentistId}
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
      </Card>
    </div>
  );
}

function appendQuery(parts: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "?";
}
