import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PatientForm, type PatientFormDefaults } from "../../patient-form";

export const metadata = { title: "Edit patient · Banilad Dental Clinic" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      medicalHistory: true,
      allergies: true,
      insuranceProvider: true,
      insurancePolicyNo: true,
      notes: true,
      deletedAt: true,
      user: { select: { email: true, isActive: true } },
    },
  });

  if (!patient) notFound();
  if (patient.deletedAt) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <p className="text-sm font-medium">This patient is archived.</p>
          <Button asChild variant="outline">
            <Link href={`/dashboard/patients/${patient.id}`}>Open record</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const defaults: PatientFormDefaults = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    sex: patient.sex,
    dateOfBirth: toDateInput(patient.dateOfBirth),
    phone: patient.phone,
    address: patient.address,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    medicalHistory: patient.medicalHistory,
    allergies: patient.allergies,
    insuranceProvider: patient.insuranceProvider,
    insurancePolicyNo: patient.insurancePolicyNo,
    notes: patient.notes,
    hasPortalLogin: patient.user.isActive,
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/dashboard/patients/${patient.id}`}>
          <ChevronLeft aria-hidden /> Back to patient
        </Link>
      </Button>
      <PageHeader title={`Edit ${patient.firstName} ${patient.lastName}`} />
      <Card>
        <CardContent className="pt-6">
          <PatientForm mode="edit" patientId={patient.id} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}

function toDateInput(d: Date): string {
  // ISO yyyy-mm-dd in UTC — matches <input type="date"> serialization.
  return d.toISOString().slice(0, 10);
}
