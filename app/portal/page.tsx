import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  KpiGrid,
  KpiCell,
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerName,
  LedgerMeta,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { firstName, cn } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import type { AppointmentStatus } from "@prisma/client";

export const metadata = { title: "My portal · Banilad Dental Clinic" };

const APPT_COLS = "170px minmax(0,1.4fr) minmax(0,1fr) 100px";

export default async function PortalHome() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  const displayName = patient?.firstName ?? firstName(user.name);

  if (!patient || patient.deletedAt) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead
          crumb="/ portal"
          title={`Hello, ${displayName}.`}
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Your patient record isn&apos;t set up yet. Please contact the clinic.
        </p>
      </div>
    );
  }

  const [upcoming, openInvoices, recentTreatmentCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        startsAt: { gte: new Date() },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        reason: true,
        dentist: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        patientId: patient.id,
        status: { in: ["ISSUED", "PARTIAL"] },
      },
      select: {
        totalCents: true,
        payments: { select: { amountCents: true } },
      },
    }),
    prisma.treatmentRecord.count({ where: { patientId: patient.id } }),
  ]);

  const outstandingCents = openInvoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    return acc + Math.max(0, inv.totalCents - paid);
  }, 0);

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        crumb="/ portal"
        title={`Hello, ${displayName}.`}
        description="Here's what's happening with your care."
      />

      <KpiGrid columns={3}>
        <KpiCell
          label="Upcoming visits"
          value={String(upcoming.length)}
          meta={upcoming.length === 0 ? "nothing booked" : "next on file"}
          href="/portal/appointments"
        />
        <KpiCell
          label="Treatments on record"
          value={String(recentTreatmentCount)}
          meta={
            recentTreatmentCount === 0
              ? "no history yet"
              : "performed at the clinic"
          }
          href="/portal/treatments"
        />
        <KpiCell
          label="Outstanding"
          value={formatCents(outstandingCents)}
          tone={outstandingCents > 0 ? "warning" : "default"}
          subtle={outstandingCents === 0}
          meta={
            outstandingCents > 0
              ? `${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`
              : "all settled"
          }
          href="/portal/invoices"
        />
      </KpiGrid>

      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 01 / upcoming"
          title="Upcoming appointments"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/portal/appointments">View all →</Link>
            </Button>
          }
        />
        {upcoming.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            You don&apos;t have any upcoming visits.{" "}
            <Link
              href="/portal/appointments/new"
              className="text-foreground underline underline-offset-4"
            >
              Book one →
            </Link>
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
            {upcoming.map((a) => (
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

      <Plate
        left="Patient portal · my care"
        right={`${user.email}`}
      />
    </div>
  );
}

const STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "text-warning",
  CONFIRMED: "text-info",
  COMPLETED: "text-success",
  CANCELLED: "text-muted-foreground line-through",
  NO_SHOW: "text-destructive",
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
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
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
