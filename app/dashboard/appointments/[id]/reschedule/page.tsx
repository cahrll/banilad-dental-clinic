import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHead } from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { RescheduleAppointmentForm } from "./reschedule-form";

export const metadata = { title: "Reschedule appointment · Banilad Dental Clinic" };

type Params = { id: string };

export default async function RescheduleAppointmentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireStaff();
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      dentistId: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentist: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  if (!appointment) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
          <Link href="/dashboard/appointments">
            <ChevronLeft aria-hidden /> Back to appointments
          </Link>
        </Button>
        <PageHead crumb="/ appointments / reschedule" title="Reschedule appointment" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Appointment not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
  const dentistName = appointment.dentist.user.name;

  if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
          <Link href="/dashboard/appointments">
            <ChevronLeft aria-hidden /> Back to appointments
          </Link>
        </Button>
        <PageHead crumb="/ appointments / reschedule" title="Reschedule appointment" description={`For ${patientName}`} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {appointment.status === "COMPLETED"
              ? "Completed appointments can't be rescheduled."
              : "Cancelled appointments can't be rescheduled."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href="/dashboard/appointments">
          <ChevronLeft aria-hidden /> Back to appointments
        </Link>
      </Button>

      <PageHead
        crumb="/ appointments / reschedule"
        title="Reschedule appointment"
        description={`For ${patientName} · currently ${formatDateTime(appointment.startsAt)}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick a new time</CardTitle>
          <CardDescription>
            With {dentistName}. Conflicts are still checked on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RescheduleAppointmentForm
            appointmentId={appointment.id}
            dentistId={appointment.dentistId}
            dentistName={dentistName}
            startsAt={appointment.startsAt.toISOString()}
            endsAt={appointment.endsAt.toISOString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
