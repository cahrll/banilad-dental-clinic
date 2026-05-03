import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { CancelButton } from "./cancel-button";

export const metadata = { title: "My appointments · Banilad Dental Clinic" };

export default async function PatientAppointmentsPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title="My appointments" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
      </div>
    );
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    orderBy: { startsAt: "desc" },
    take: 50,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      reason: true,
      dentist: { select: { user: { select: { name: true } } } },
    },
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.endsAt >= now && a.status !== "CANCELLED");
  const past = appointments.filter((a) => !(a.endsAt >= now && a.status !== "CANCELLED"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My appointments"
        description="Book a slot, view upcoming visits, or cancel."
        actions={
          <Button asChild size="sm">
            <Link href="/portal/appointments/new">
              <Plus aria-hidden /> Book appointment
            </Link>
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <CalendarRange className="size-5" aria-hidden />
              </span>
              <p className="text-sm font-medium">No upcoming appointments.</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Book a visit with one of our dentists.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="space-y-1">
                    <p className="font-medium">{formatDateTime(a.startsAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.dentist.user.name}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppointmentStatusBadge status={a.status} />
                    {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
                      <CancelButton appointmentId={a.id} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Past</h2>
        {past.length === 0 ? (
          <p className="text-xs text-muted-foreground">No past appointments yet.</p>
        ) : (
          <div className="space-y-2">
            {past.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="space-y-1">
                    <p className="text-sm">{formatDateTime(a.startsAt)}</p>
                    <p className="text-xs text-muted-foreground">{a.dentist.user.name}</p>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
