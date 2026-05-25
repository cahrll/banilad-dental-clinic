import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerName,
  LedgerMeta,
  LedgerAmt,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata = { title: "My treatments · Banilad Dental Clinic" };

const COLS = "110px minmax(0,1.4fr) minmax(0,1.2fr) 110px";

export default async function PatientTreatmentsPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead crumb="/ treatments" title="My treatments" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Your patient record isn&apos;t set up yet. Please contact the clinic.
        </p>
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

  const totalCents = treatments.reduce((acc, t) => acc + t.feeCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        crumb="/ treatments"
        title="My treatments"
        description="Procedures performed at the clinic."
      />

      {treatments.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          No treatments yet. Procedures recorded by your dentist will show here.
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Date",
              "Procedure",
              "Teeth · dentist",
              { label: "Fee", align: "right" },
            ]}
          />
          {treatments.map((t) => {
            const teeth = t.toothEntries
              .map((e) => e.toothNumber)
              .sort((a, b) => a - b);
            const teethLabel = teeth.length === 0 ? "—" : teeth.join(", ");
            return (
              <LedgerRow key={t.id} cols={COLS}>
                <LedgerNum>{formatDate(t.performedAt)}</LedgerNum>
                <LedgerName sub={t.diagnosis ? `· ${t.diagnosis}` : undefined}>
                  {t.procedure}
                </LedgerName>
                <LedgerMeta>
                  {teethLabel} · {t.dentist.user.name}
                </LedgerMeta>
                <LedgerAmt>{formatCents(t.feeCents)}</LedgerAmt>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left="Treatments · clinical history"
        right={treatments.length > 0 ? `total ${formatCents(totalCents)}` : "—"}
      />
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
