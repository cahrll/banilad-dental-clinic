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
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PatientBookForm } from "./patient-book-form";

export const metadata = { title: "Book appointment · Banilad Dental Clinic" };

export default async function PortalNewAppointmentPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/portal/appointments">
            <ChevronLeft aria-hidden /> Back to my appointments
          </Link>
        </Button>
        <PageHeader title="Book appointment" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
      </div>
    );
  }

  const dentists = await prisma.dentist.findMany({
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } }, specialty: true },
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/portal/appointments">
          <ChevronLeft aria-hidden /> Back to my appointments
        </Link>
      </Button>

      <PageHeader
        title="Book appointment"
        description="Choose a dentist, then pick an available time. We'll confirm shortly after booking."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit details</CardTitle>
          <CardDescription>
            Slots within 2 hours from now aren&apos;t bookable online.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PatientBookForm
            dentists={dentists.map((d) => ({
              id: d.id,
              name: d.user.name,
              specialty: d.specialty,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
