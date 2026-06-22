import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { buildConditionMap } from "@/lib/teeth";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  AppointmentStatus,
  InvoiceStatus,
} from "@prisma/client";
import {
  ArchiveButton,
  HardDeleteButton,
  RestoreButton,
} from "./delete-buttons";
import { DentalChartTab } from "./dental-chart-tab";

export const metadata = { title: "Patient · Banilad Dental Clinic" };

const APPT_COLS = "150px minmax(0,1.5fr) minmax(0,1fr) 100px";
const TX_COLS = "110px minmax(0,1.5fr) minmax(0,1fr) 110px";
const INV_COLS = "110px 110px minmax(0,1fr) 110px 90px";

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

  const [appointments, conditionRows, treatments, invoices] = await Promise.all([
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

  const isAdmin = currentUser.role === "ADMIN";
  const archived = !!patient.deletedAt;
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const portalLogin = !patient.user.email.startsWith("noportal-");
  const totalTreatmentCents = treatments.reduce(
    (acc, t) => acc + t.feeCents,
    0,
  );

  return (
    <div className="flex flex-col gap-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit font-mono text-[11px] uppercase tracking-wider"
      >
        <Link href="/dashboard/patients">
          <ChevronLeft aria-hidden /> Back to patients
        </Link>
      </Button>

      <PageHead
        crumb={`/ patients / ${slug(fullName)}`}
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
              <Button
                asChild
                variant="outline"
                size="sm"
                className="font-mono text-[11px] uppercase tracking-wider"
              >
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

      {/* Chip strip with mono labels */}
      <div
        data-tabular
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        <ArchivedTag archived={archived} />
        <span>· {sexLabel(patient.sex)}</span>
        <span>
          · {ageInYears(patient.dateOfBirth)} yrs · DOB{" "}
          {formatDate(patient.dateOfBirth)}
        </span>
        {patient.phone ? <span>· {patient.phone}</span> : null}
      </div>

      {/* Anchor strip */}
      <nav
        aria-label="Patient sections"
        className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        <a href="#profile" className="hover:text-foreground">
          § 01 / profile
        </a>
        <a href="#appointments" className="hover:text-foreground">
          § 02 / appointments
        </a>
        <a href="#dental-chart" className="hover:text-foreground">
          § 03 / dental chart
        </a>
        <a href="#treatments" className="hover:text-foreground">
          § 04 / treatments
        </a>
        <a href="#invoices" className="hover:text-foreground">
          § 05 / invoices
        </a>
      </nav>

      {/* §01 Profile */}
      <section id="profile" className="scroll-mt-20 flex flex-col gap-4">
        <PageHead
          variant="section"
          crumb="§ 01 / profile"
          title="Profile"
        />
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailGroup title="Contact">
            <DetailRow label="Phone" value={patient.phone} />
            <DetailRow label="Address" value={patient.address} multiline />
          </DetailGroup>
          <DetailGroup title="Emergency">
            <DetailRow label="Name" value={patient.emergencyContactName} />
            <DetailRow label="Phone" value={patient.emergencyContactPhone} />
          </DetailGroup>
          <DetailGroup title="Medical">
            <DetailRow
              label="History"
              value={patient.medicalHistory}
              multiline
            />
            <DetailRow label="Allergies" value={patient.allergies} multiline />
          </DetailGroup>
          <DetailGroup title="Insurance">
            <DetailRow label="Provider" value={patient.insuranceProvider} />
            <DetailRow label="Policy #" value={patient.insurancePolicyNo} />
          </DetailGroup>
        </div>
        {patient.notes ? (
          <div className="border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Internal notes
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {patient.notes}
            </p>
          </div>
        ) : null}
      </section>

      {/* §02 Appointments */}
      <section id="appointments" className="scroll-mt-20 flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 02 / appointments"
          title="Appointments"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/dashboard/appointments">Open calendar →</Link>
            </Button>
          }
        />
        {appointments.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No appointments yet. Book one from the appointments page.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={APPT_COLS}
              labels={[
                "When",
                "Dentist",
                "Reason",
                { label: "Status", align: "right" },
              ]}
            />
            {appointments.map((a) => (
              <LedgerRow key={a.id} cols={APPT_COLS}>
                <LedgerNum>{formatDateTime(a.startsAt)}</LedgerNum>
                <LedgerName>{a.dentist.user.name}</LedgerName>
                <LedgerMeta>{a.reason ?? "—"}</LedgerMeta>
                <AppointmentStatusInk status={a.status} />
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* §03 Dental chart */}
      <section id="dental-chart" className="scroll-mt-20 flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 03 / dental chart"
          title="Dental chart"
        />
        <DentalChartTab
          patientId={patient.id}
          conditions={conditions}
          conditionNotes={conditionNotes}
        />
      </section>

      {/* §04 Treatments */}
      <section id="treatments" className="scroll-mt-20 flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 04 / treatments"
          title="Treatments"
          actions={
            <>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {treatments.length} on file
                {treatments.length > 0
                  ? ` · total ${formatCents(totalTreatmentCents)}`
                  : ""}
              </span>
              <Button
                asChild
                size="sm"
                className="font-mono text-[11px] uppercase tracking-wider"
              >
                <Link
                  href={`/dashboard/treatments/new?patientId=${patient.id}`}
                >
                  <Plus aria-hidden /> Record
                </Link>
              </Button>
            </>
          }
        />
        {treatments.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No treatments recorded yet.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={TX_COLS}
              labels={[
                "Date",
                "Procedure",
                "Teeth · dentist",
                { label: "Fee", align: "right" },
              ]}
            />
            {treatments.map((t) => {
              const teeth =
                t.toothEntries.length === 0
                  ? "—"
                  : t.toothEntries
                      .map((e) => e.toothNumber)
                      .sort((a, b) => a - b)
                      .join(", ");
              return (
                <LedgerRow key={t.id} cols={TX_COLS}>
                  <LedgerNum>{formatDate(t.performedAt)}</LedgerNum>
                  <LedgerName sub={t.diagnosis ? `· ${t.diagnosis}` : undefined}>
                    {t.procedure}
                  </LedgerName>
                  <LedgerMeta>
                    {teeth} · {t.dentist.user.name}
                  </LedgerMeta>
                  <LedgerAmt>{formatCents(t.feeCents)}</LedgerAmt>
                </LedgerRow>
              );
            })}
          </Ledger>
        )}
      </section>

      {/* §05 Invoices */}
      <section id="invoices" className="scroll-mt-20 flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 05 / invoices"
          title="Invoices"
          actions={
            <Button
              asChild
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href={`/dashboard/billing/new?patientId=${patient.id}`}>
                <Receipt aria-hidden /> New invoice
              </Link>
            </Button>
          }
        />
        {invoices.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No invoices yet for this patient.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={INV_COLS}
              labels={[
                "Invoice",
                "Issued",
                "",
                { label: "Total", align: "right" },
                { label: "Status", align: "right" },
              ]}
            />
            {invoices.map((inv) => {
              const paid = inv.payments.reduce(
                (acc, p) => acc + p.amountCents,
                0,
              );
              const balance = Math.max(0, inv.totalCents - paid);
              return (
                <LedgerRow
                  key={inv.id}
                  cols={INV_COLS}
                  href={`/dashboard/billing/${inv.id}`}
                >
                  <LedgerNum>{inv.number}</LedgerNum>
                  <LedgerNum>
                    {inv.issuedAt ? formatDate(inv.issuedAt) : "—"}
                  </LedgerNum>
                  <LedgerMeta>
                    {balance > 0 ? `${formatCents(balance)} due` : "Settled"}
                  </LedgerMeta>
                  <LedgerAmt
                    balance={balance > 0 ? `bal ${formatCents(balance)}` : undefined}
                    tone={balance > 0 ? "warning" : "success"}
                  >
                    {formatCents(inv.totalCents)}
                  </LedgerAmt>
                  <InvoiceStatusInk status={inv.status} />
                </LedgerRow>
              );
            })}
          </Ledger>
        )}
      </section>

      <Plate
        left={`Patient · ${fullName}`}
        right={`${appointments.length} appts · ${treatments.length} tx · ${invoices.length} invoices`}
      />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function DetailGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
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
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
      {value ? (
        <p className={multiline ? "whitespace-pre-wrap" : "truncate"}>{value}</p>
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
    </div>
  );
}

function ArchivedTag({ archived }: { archived: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        archived ? "text-muted-foreground" : "text-success",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-1.5 rounded-full",
          archived ? "bg-muted-foreground" : "bg-success",
        )}
      />
      {archived ? "Archived" : "Active"}
    </span>
  );
}

const APPT_STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "text-warning",
  CONFIRMED: "text-info",
  COMPLETED: "text-success",
  CANCELLED: "text-muted-foreground line-through",
  NO_SHOW: "text-destructive",
};
const APPT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

function AppointmentStatusInk({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "text-right font-mono text-[10px] uppercase tracking-wider",
        APPT_STATUS_TONE[status],
      )}
    >
      {APPT_STATUS_LABEL[status]}
    </span>
  );
}

const INVOICE_STATUS_TONE: Record<InvoiceStatus, string> = {
  DRAFT: "text-muted-foreground",
  ISSUED: "text-info",
  PARTIAL: "text-warning",
  PAID: "text-success",
  VOID: "text-muted-foreground line-through",
};

function InvoiceStatusInk({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={cn(
        "text-right font-mono text-[10px] uppercase tracking-wider",
        INVOICE_STATUS_TONE[status],
      )}
    >
      {status.toLowerCase()}
    </span>
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

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
