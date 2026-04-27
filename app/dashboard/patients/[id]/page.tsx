import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  Pencil,
  Receipt,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/page-header";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { buildConditionMap } from "@/lib/teeth";
import { formatCents } from "@/lib/money";
import { InvoiceStatusBadge } from "@/components/app/invoice-status-badge";
import {
  ArchiveButton,
  HardDeleteButton,
  RestoreButton,
} from "./delete-buttons";
import { DentalChartTab } from "./dental-chart-tab";
import { TreatmentsTab, type TreatmentRow } from "./treatments-tab";

export const metadata = { title: "Patient · Banilad Dental Clinic" };

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: currentUser } = await requireStaff();
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
      createdAt: true,
      updatedAt: true,
      user: { select: { email: true, isActive: true } },
    },
  });

  if (!patient) notFound();

  const [appointments, conditionRows, treatmentRows, dentists, invoices] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: id },
      orderBy: { startsAt: "desc" },
      take: 30,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        reason: true,
        dentist: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.toothCondition.findMany({
      where: { patientId: id },
      select: { toothNumber: true, status: true, note: true },
    }),
    prisma.treatmentRecord.findMany({
      where: { patientId: id },
      orderBy: { performedAt: "desc" },
      take: 50,
      select: {
        id: true,
        procedure: true,
        diagnosis: true,
        notes: true,
        performedAt: true,
        feeCents: true,
        dentist: { select: { user: { select: { name: true } } } },
        toothEntries: { select: { toothNumber: true } },
      },
    }),
    prisma.dentist.findMany({
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        number: true,
        status: true,
        totalCents: true,
        issuedAt: true,
        payments: { select: { amountCents: true } },
      },
    }),
  ]);

  const conditions = buildConditionMap(conditionRows);
  const conditionNotes: Record<number, string | null> = {};
  for (const c of conditionRows) conditionNotes[c.toothNumber] = c.note;

  const treatmentRowsForUI: TreatmentRow[] = treatmentRows.map((t) => ({
    id: t.id,
    procedure: t.procedure,
    diagnosis: t.diagnosis,
    notes: t.notes,
    performedAt: t.performedAt.toISOString(),
    feeCents: t.feeCents,
    dentistName: t.dentist.user.name,
    toothNumbers: t.toothEntries.map((e) => e.toothNumber).sort((a, b) => a - b),
  }));

  const isAdmin = currentUser.role === "ADMIN";
  const archived = !!patient.deletedAt;
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const portalLogin = !patient.user.email.startsWith("noportal-");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/dashboard/patients">
          <ChevronLeft aria-hidden /> Back to patients
        </Link>
      </Button>

      <PageHeader
        title={fullName}
        description={
          archived
            ? "This patient is archived. Restore to make changes."
            : portalLogin
            ? patient.user.email
            : "No portal login"
        }
        actions={
          <>
            {!archived ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/patients/${patient.id}/edit`}>
                  <Pencil aria-hidden /> Edit
                </Link>
              </Button>
            ) : null}
            {archived ? (
              <RestoreButton patientId={patient.id} />
            ) : (
              <ArchiveButton patientId={patient.id} />
            )}
            {isAdmin ? <HardDeleteButton patientId={patient.id} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {archived ? <Badge variant="secondary">Archived</Badge> : <Badge>Active</Badge>}
        <span>·</span>
        <span>{sexLabel(patient.sex)}</span>
        <span>·</span>
        <span>{ageInYears(patient.dateOfBirth)} yrs · DOB {formatDate(patient.dateOfBirth)}</span>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">
            <UserRound className="size-4" aria-hidden /> Info
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <CalendarRange className="size-4" aria-hidden /> Appointments
          </TabsTrigger>
          <TabsTrigger value="chart">
            <Stethoscope className="size-4" aria-hidden /> Dental chart
          </TabsTrigger>
          <TabsTrigger value="treatments">
            <Stethoscope className="size-4" aria-hidden /> Treatments
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="size-4" aria-hidden /> Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="Contact">
              <DetailRow label="Phone" value={patient.phone} />
              <DetailRow label="Address" value={patient.address} multiline />
            </DetailCard>
            <DetailCard title="Emergency contact">
              <DetailRow label="Name" value={patient.emergencyContactName} />
              <DetailRow label="Phone" value={patient.emergencyContactPhone} />
            </DetailCard>
            <DetailCard title="Medical">
              <DetailRow label="History" value={patient.medicalHistory} multiline />
              <DetailRow label="Allergies" value={patient.allergies} multiline />
            </DetailCard>
            <DetailCard title="Insurance">
              <DetailRow label="Provider" value={patient.insuranceProvider} />
              <DetailRow label="Policy #" value={patient.insurancePolicyNo} />
            </DetailCard>
          </div>
          {patient.notes ? (
            <DetailCard title="Internal notes">
              <p className="whitespace-pre-wrap text-sm">{patient.notes}</p>
            </DetailCard>
          ) : null}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarRange className="size-5 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">No appointments yet.</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Book one from the Appointments page.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/dashboard/appointments">Open calendar</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {appointments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{formatDateTime(a.startsAt)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.dentist.user.name}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          {/* DentalChartTab is the Phase 4 interactive tooth chart */}
          <DentalChartTab
            patientId={patient.id}
            conditions={conditions}
            conditionNotes={conditionNotes}
          />
        </TabsContent>

        <TabsContent value="treatments" className="mt-4">
          <TreatmentsTab
            patientId={patient.id}
            patientName={fullName}
            dentists={dentists.map((d) => ({ id: d.id, name: d.user.name }))}
            treatments={treatmentRowsForUI}
            conditions={conditions}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </p>
            <Button asChild size="sm">
              <Link href={`/dashboard/billing/new?patientId=${patient.id}`}>
                <Receipt aria-hidden /> New invoice
              </Link>
            </Button>
          </div>

          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No invoices yet for this patient.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((acc, p) => acc + p.amountCents, 0);
                const balance = Math.max(0, inv.totalCents - paid);
                return (
                  <Card key={inv.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="space-y-1">
                        <Link
                          href={`/dashboard/billing/${inv.id}`}
                          className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {inv.number}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {inv.issuedAt ? `Issued ${formatDate(inv.issuedAt)}` : "Draft"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <InvoiceStatusBadge status={inv.status} />
                        <div className="text-right text-sm">
                          <p className="font-medium">{formatCents(inv.totalCents)}</p>
                          <p className="text-xs text-muted-foreground">
                            {balance > 0 ? `${formatCents(balance)} due` : "Settled"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? (
        <p className={multiline ? "whitespace-pre-wrap" : "truncate"}>{value}</p>
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
    </div>
  );
}

const sexLabels: Record<"MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED", string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNDISCLOSED: "Sex undisclosed",
};

function sexLabel(s: keyof typeof sexLabels) {
  return sexLabels[s];
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function ageInYears(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}
