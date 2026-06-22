import Link from "next/link";
import {
  CalendarRange,
  CreditCard,
  Package,
  Plus,
  Printer,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import {
  KpiGrid,
  KpiCell,
  LaneKey,
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerName,
  LedgerMeta,
  NowTag,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import type { AppointmentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard · Banilad Dental Clinic" };

const APPT_LEDGER_COLS = "110px minmax(0,1.4fr) minmax(0,1fr) 110px";
const STOCK_LEDGER_COLS = "minmax(0,1.5fr) 70px 70px minmax(0,90px)";

export default async function DashboardHome() {
  const { user } = await requireStaff();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  // 7-day backward window ending today (inclusive of today + 6 previous days)
  const sevenBack = new Date(startOfDay);
  sevenBack.setDate(startOfDay.getDate() - 6);

  // 7-day forward window starting tomorrow
  const tomorrow = new Date(startOfDay);
  tomorrow.setDate(startOfDay.getDate() + 1);
  const sevenForward = new Date(tomorrow);
  sevenForward.setDate(tomorrow.getDate() + 7);

  const [
    todayAppointments,
    upcomingCount,
    activePatientsCount,
    outstandingInvoices,
    lowStockItems,
    recentAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        reason: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gt: endOfDay },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    }),
    prisma.patient.count({ where: { deletedAt: { equals: null } } }),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIAL"] } },
      select: {
        id: true,
        totalCents: true,
        payments: { select: { amountCents: true } },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        stockOnHand: true,
        reorderPoint: true,
        unit: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: sevenBack, lte: endOfDay },
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      },
      select: { startsAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: tomorrow, lt: sevenForward },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      select: { startsAt: true },
    }),
    prisma.patient.findMany({
      where: {
        createdAt: { gte: sevenBack },
        deletedAt: { equals: null },
      },
      select: { createdAt: true },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: sevenBack } },
      select: { paidAt: true, amountCents: true },
    }),
  ]);

  const todayAppointmentsCount = todayAppointments.length;
  const outstandingCents = outstandingInvoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((p, x) => p + x.amountCents, 0);
    return acc + Math.max(0, inv.totalCents - paid);
  }, 0);

  const lowStock = lowStockItems.filter((i) => i.stockOnHand <= i.reorderPoint);

  // 7-bucket daily series for each KPI sparkline.
  const apptSeries = bucketByDay(
    recentAppointments.map((a) => ({ date: a.startsAt })),
    sevenBack,
    7,
  );
  const upcomingSeries = bucketByDay(
    upcomingAppointments.map((a) => ({ date: a.startsAt })),
    tomorrow,
    7,
  );
  const patientSeries = bucketByDay(
    recentPatients.map((p) => ({ date: p.createdAt })),
    sevenBack,
    7,
  );
  const paymentSeries = bucketByDay(
    recentPayments.map((p) => ({ date: p.paidAt, value: p.amountCents })),
    sevenBack,
    7,
  );
  const newPatientsThisWeek = patientSeries.reduce((a, b) => a + b, 0);
  const collectedThisWeek = paymentSeries.reduce((a, b) => a + b, 0);

  const isoDate = formatPHTDate(now); // 2026-05-26
  const livePHTTime = formatPHTTime(now); // 10:34

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        crumb={`/ dashboard / ${isoDate}`}
        title="Today's operations"
        actions={
          <>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/dashboard/billing?status=ISSUED">
                <Printer aria-hidden /> Day-sheet
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/dashboard/appointments/new">
                <Plus aria-hidden /> Appointment
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI block */}
      <KpiGrid columns={4}>
        <KpiCell
          label="Today's appointments"
          value={String(todayAppointmentsCount)}
          meta="last 7 days"
          series={apptSeries}
          href="/dashboard/appointments"
        />
        <KpiCell
          label="Upcoming"
          value={String(upcomingCount)}
          meta="next 7 days"
          series={upcomingSeries}
          href="/dashboard/appointments"
        />
        <KpiCell
          label="Active patients"
          value={String(activePatientsCount)}
          meta={
            newPatientsThisWeek === 0
              ? "no new patients this week"
              : `${newPatientsThisWeek} new this week`
          }
          series={patientSeries}
          href="/dashboard/patients"
        />
        <KpiCell
          label="Outstanding"
          value={formatCents(outstandingCents)}
          tone={outstandingCents > 0 ? "warning" : "default"}
          subtle={outstandingInvoices.length === 0}
          meta={
            outstandingInvoices.length === 0
              ? "all settled"
              : `${outstandingInvoices.length} open · ${formatCents(collectedThisWeek)} collected this week`
          }
          series={paymentSeries}
          href="/dashboard/billing?status=ISSUED"
        />
      </KpiGrid>

      {/* Today's column */}
      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb={`/ today / ${isoDate}`}
          title="Today's column"
          actions={<NowTag>live · {livePHTTime}</NowTag>}
        />
        <LaneKey
          items={[
            { label: "Confirmed", dotClass: "bg-info" },
            { label: "Scheduled", dotClass: "bg-warning" },
            { label: "Completed", dotClass: "bg-success" },
            { label: "Cancelled", dotClass: "bg-muted-foreground/60" },
          ]}
        />
        {todayAppointments.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No appointments today. Quiet hours.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={APPT_LEDGER_COLS}
              labels={[
                "Time",
                "Patient",
                "Reason",
                { label: "Status", align: "right" },
              ]}
            />
            {todayAppointments.map((appt) => (
              <LedgerRow key={appt.id} cols={APPT_LEDGER_COLS}>
                <LedgerNum>
                  {formatTimeRange(appt.startsAt, appt.endsAt)}
                </LedgerNum>
                <LedgerName>
                  {formatPatientShort(
                    appt.patient.firstName,
                    appt.patient.lastName,
                  )}
                </LedgerName>
                <LedgerMeta>{appt.reason ?? "—"}</LedgerMeta>
                <StatusInk status={appt.status} />
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* Low stock */}
      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="/ alerts / low stock"
          title="Low stock"
          actions={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href="/dashboard/inventory">Open inventory →</Link>
            </Button>
          }
        />
        {lowStock.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Nothing below reorder point. Inventory is healthy.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={STOCK_LEDGER_COLS}
              labels={[
                "Item",
                { label: "On hand", align: "right" },
                { label: "Reorder", align: "right" },
                { label: "Unit", align: "right" },
              ]}
            />
            {lowStock.map((it) => (
              <LedgerRow
                key={it.id}
                cols={STOCK_LEDGER_COLS}
                href={`/dashboard/inventory/${it.id}`}
              >
                <LedgerName>{it.name}</LedgerName>
                <span className="text-right font-mono text-sm font-semibold tabular-nums text-warning">
                  {it.stockOnHand}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {it.reorderPoint}
                </span>
                <span className="text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {it.unit}
                </span>
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* Quick links */}
      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="/ quick links"
          title="Frequently used"
        />
        <div className="flex flex-wrap gap-2">
          <QuickLink href="/dashboard/patients/new" Icon={Users} label="New patient" />
          <QuickLink href="/dashboard/appointments" Icon={CalendarRange} label="Calendar" />
          <QuickLink href="/dashboard/billing" Icon={CreditCard} label="Billing" />
          <QuickLink href="/dashboard/inventory" Icon={Package} label="Inventory" />
          <QuickLink href="/dashboard/treatments" Icon={Stethoscope} label="Treatments" />
          {user.role === "ADMIN" ? (
            <QuickLink href="/dashboard/staff" Icon={UserCog} label="Staff" />
          ) : null}
        </div>
      </section>

      <Plate
        left="Dashboard · staff console"
        right={`${user.role.toLowerCase()} · ${user.email}`}
      />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Bucket items by day into a fixed-length series.
 * Day boundaries are taken from `start` and incremented by 24h.
 */
function bucketByDay(
  items: { date: Date; value?: number }[],
  start: Date,
  days: number,
): number[] {
  const buckets = new Array<number>(days).fill(0);
  const startMs = start.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  for (const it of items) {
    const idx = Math.floor((it.date.getTime() - startMs) / dayMs);
    if (idx >= 0 && idx < days) {
      buckets[idx] += it.value ?? 1;
    }
  }
  return buckets;
}

function formatPHTDate(d: Date): string {
  // 2026-05-26 (en-CA gives ISO yyyy-mm-dd)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatPHTTime(d: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatTimeRange(start: Date, end: Date): string {
  return `${formatPHTTime(start)}—${formatPHTTime(end)}`;
}

function formatPatientShort(first: string, last: string): string {
  // "Santos, E.".
  const initial = first ? first[0]!.toUpperCase() : "";
  return `${last}, ${initial}.`;
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

function StatusInk({ status }: { status: AppointmentStatus }) {
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

function QuickLink({
  href,
  Icon,
  label,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="font-mono text-[11px] uppercase tracking-wider"
    >
      <Link href={href}>
        <Icon aria-hidden /> {label}
      </Link>
    </Button>
  );
}
