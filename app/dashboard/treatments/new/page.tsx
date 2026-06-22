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
import { buildConditionMap } from "@/lib/teeth";
import { PatientPicker } from "./patient-picker";
import { RecordTreatmentForm } from "./record-treatment-form";

export const metadata = { title: "Record treatment · Banilad Dental Clinic" };

type SearchParams = { patientId?: string };

export default async function NewTreatmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { patientId } = await searchParams;

  // No patient yet → render the inline picker. Mirrors billing's "open a
  // patient" prompt but with an active search since list-level recording is
  // a documented entry point here.
  if (!patientId) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
          <Link href="/dashboard/treatments">
            <ChevronLeft aria-hidden /> Back to treatments
          </Link>
        </Button>
        <PageHead
          crumb="/ treatments / new"
          title="Record treatment"
          description="Pick a patient to record a procedure for."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient</CardTitle>
            <CardDescription>
              Search by name or email. The patient&apos;s dental chart loads on
              the next step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PatientPicker />
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
          <Link href="/dashboard/treatments">
            <ChevronLeft aria-hidden /> Back to treatments
          </Link>
        </Button>
        <PageHead crumb="/ treatments / new" title="Record treatment" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Patient not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [dentists, conditionRows] = await Promise.all([
    prisma.dentist.findMany({
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.toothCondition.findMany({
      where: { patientId: patient.id },
      select: { toothNumber: true, status: true, note: true },
    }),
  ]);

  const conditions = buildConditionMap(conditionRows);
  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href={`/dashboard/patients/${patient.id}`}>
          <ChevronLeft aria-hidden /> Back to {fullName}
        </Link>
      </Button>

      <PageHead
        crumb={`/ treatments / ${patient.firstName.toLowerCase()} / new`}
        title="Record treatment"
        description={`For ${fullName}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procedure details</CardTitle>
          <CardDescription>
            Select affected teeth on the chart, then describe the procedure. The
            record is saved on this patient&apos;s history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecordTreatmentForm
            patientId={patient.id}
            patientName={fullName}
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            conditions={conditions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
