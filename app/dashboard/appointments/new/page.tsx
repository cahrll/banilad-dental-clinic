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
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { NewAppointmentForm } from "./new-appointment-form";

export const metadata = { title: "New appointment · Banilad Dental Clinic" };

type SearchParams = { patientId?: string };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { patientId } = await searchParams;

  const dentists = await prisma.dentist.findMany({
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });

  let initialPatient: { id: string; name: string } | null = null;
  if (patientId) {
    const p = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, deletedAt: true },
    });
    if (p && !p.deletedAt) {
      initialPatient = { id: p.id, name: `${p.firstName} ${p.lastName}` };
    }
  }

  const backHref = initialPatient
    ? `/dashboard/patients/${initialPatient.id}`
    : "/dashboard/appointments";
  const backLabel = initialPatient
    ? `Back to ${initialPatient.name}`
    : "Back to appointments";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={backHref}>
          <ChevronLeft aria-hidden /> {backLabel}
        </Link>
      </Button>

      <PageHeader
        title="New appointment"
        description={
          initialPatient
            ? `For ${initialPatient.name}`
            : "Pick a patient and an open time slot."
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment details</CardTitle>
          <CardDescription>
            Conflicts are still checked on the server before booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewAppointmentForm
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            initialPatient={initialPatient}
          />
        </CardContent>
      </Card>
    </div>
  );
}
