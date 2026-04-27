import { Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata = { title: "My treatments · Banilad Dental Clinic" };

export default async function PatientTreatmentsPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title="My treatments" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
      </div>
    );
  }

  const treatments = await prisma.treatmentRecord.findMany({
    where: { patientId: patient.id },
    orderBy: { performedAt: "desc" },
    select: {
      id: true,
      procedure: true,
      diagnosis: true,
      performedAt: true,
      feeCents: true,
      dentist: { select: { user: { select: { name: true } } } },
      toothEntries: { select: { toothNumber: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My treatments"
        description="Procedures performed at the clinic."
      />

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Stethoscope className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No treatments yet.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Procedures recorded by your dentist will show here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {treatments.map((t) => {
            const teeth = t.toothEntries
              .map((e) => e.toothNumber)
              .sort((a, b) => a - b);
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="space-y-1">
                    <p className="font-medium">{t.procedure}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(t.performedAt)} · {t.dentist.user.name}
                      {teeth.length > 0
                        ? ` · Teeth ${teeth.join(", ")}`
                        : ""}
                    </p>
                    {t.diagnosis ? (
                      <p className="text-sm">{t.diagnosis}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm font-medium">
                    {formatCents(t.feeCents)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
