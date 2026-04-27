import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "date-fns";
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
import { NewAppointmentTrigger } from "./new-appointment-trigger";

export const metadata = { title: "Appointments · Banilad Dental Clinic" };

type SearchParams = { week?: string; dentistId?: string };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { week, dentistId } = await searchParams;

  const cursor = week ? new Date(`${week}T00:00:00`) : new Date();
  const start = weekStart(cursor);
  const days = weekDays(start);
  const { start: rangeStart, end: rangeEnd } = rangeForWeek(start);

  const [dentists, appointments] = await Promise.all([
    prisma.dentist.findMany({
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: rangeStart, lte: rangeEnd },
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

  const prevHref = appendQuery({
    week: isoDateInput(addDays(start, -7)),
    dentistId,
  });
  const nextHref = appendQuery({
    week: isoDateInput(addDays(start, 7)),
    dentistId,
  });
  const todayHref = appendQuery({ dentistId });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description={`Week of ${formatDateLong(start)}`}
        actions={
          <NewAppointmentTrigger
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            defaultDentistId={dentistId}
            defaultStart={start}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>
            <ChevronLeft aria-hidden /> Prev
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={todayHref}>Today</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>
            Next <ChevronRight aria-hidden />
          </Link>
        </Button>
        <div className="ms-auto">
          <DentistFilter
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            selected={dentistId}
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <WeekGrid
          days={days}
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
