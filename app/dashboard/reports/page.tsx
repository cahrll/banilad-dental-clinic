import {
  KpiGrid,
  KpiCell,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { RangeSelector } from "./range-selector";
import {
  AppointmentsPerDentistChart,
  RevenueChart,
  TopProceduresChart,
} from "./reports-charts";

export const metadata = { title: "Reports · Banilad Dental Clinic" };

type SearchParams = { range?: string };

const RANGES = {
  "30": { days: 30, label: "Last 30 days" },
  "90": { days: 90, label: "Last 90 days" },
  "365": { days: 365, label: "Last 12 months" },
} as const;

type RangeKey = keyof typeof RANGES;

function isRangeKey(v: string | undefined): v is RangeKey {
  return v === "30" || v === "90" || v === "365";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["ADMIN", "DENTIST"]);
  const { range } = await searchParams;
  const rangeKey: RangeKey = isRangeKey(range) ? range : "90";
  const { days, label } = RANGES[rangeKey];

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [
    payments,
    appointmentsInRange,
    treatments,
    dentists,
    outstandingInvoices,
    newPatients,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: start } },
      select: { amountCents: true, paidAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: start },
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
      },
      select: { dentistId: true, status: true, startsAt: true },
    }),
    prisma.treatmentRecord.findMany({
      where: { performedAt: { gte: start } },
      select: { procedure: true, feeCents: true },
    }),
    prisma.dentist.findMany({
      select: {
        id: true,
        user: { select: { name: true, isActive: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIAL"] } },
      select: {
        id: true,
        totalCents: true,
        dueAt: true,
        payments: { select: { amountCents: true } },
      },
    }),
    prisma.patient.count({
      where: {
        deletedAt: { equals: null },
        createdAt: { gte: start },
      },
    }),
  ]);

  // ---- Revenue: bucket by day for ≤90 days, by month otherwise ----
  const bucketByMonth = days > 90;
  const revenueBuckets = new Map<string, number>();

  // Pre-seed so empty days/months still appear on the chart.
  if (bucketByMonth) {
    const cursor = new Date(start);
    cursor.setDate(1);
    while (cursor <= now) {
      revenueBuckets.set(monthKey(cursor), 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(start);
    while (cursor <= now) {
      revenueBuckets.set(dayKey(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  for (const p of payments) {
    const k = bucketByMonth ? monthKey(p.paidAt) : dayKey(p.paidAt);
    revenueBuckets.set(k, (revenueBuckets.get(k) ?? 0) + p.amountCents);
  }

  const revenueSeries = Array.from(revenueBuckets.entries()).map(
    ([k, cents]) => ({
      bucket: k,
      label: bucketByMonth ? formatMonthLabel(k) : formatDayLabel(k),
      cents,
      amount: cents / 100,
    }),
  );

  const totalRevenueCents = payments.reduce((acc, p) => acc + p.amountCents, 0);

  // ---- Appointments per dentist ----
  const apptCounts = new Map<string, number>();
  for (const a of appointmentsInRange) {
    apptCounts.set(a.dentistId, (apptCounts.get(a.dentistId) ?? 0) + 1);
  }
  const appointmentsPerDentist = dentists
    .map((d) => ({
      name: shortName(d.user.name),
      count: apptCounts.get(d.id) ?? 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  // ---- Top procedures (by count, with revenue secondary) ----
  const procedureMap = new Map<string, { count: number; cents: number }>();
  for (const t of treatments) {
    const cur = procedureMap.get(t.procedure) ?? { count: 0, cents: 0 };
    cur.count += 1;
    cur.cents += t.feeCents;
    procedureMap.set(t.procedure, cur);
  }
  const topProcedures = Array.from(procedureMap.entries())
    .map(([name, v]) => ({ name, count: v.count, cents: v.cents }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ---- Outstanding (current state, not period-specific) ----
  let outstandingCents = 0;
  let overdueCount = 0;
  const today = new Date();
  for (const inv of outstandingInvoices) {
    const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    const balance = Math.max(0, inv.totalCents - paid);
    outstandingCents += balance;
    if (balance > 0 && inv.dueAt && inv.dueAt < today) overdueCount += 1;
  }

  // ---- Sparkline series for KPI cells ----
  const revSpark = revenueSeries.slice(-7).map((b) => b.cents);
  const apptSpark = (() => {
    const buckets = new Array<number>(7).fill(0);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffMs = cutoff.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    for (const a of appointmentsInRange) {
      const idx = Math.floor((a.startsAt.getTime() - cutoffMs) / dayMs);
      if (idx >= 0 && idx < 7) buckets[idx] += 1;
    }
    return buckets;
  })();

  const noActivity =
    payments.length === 0 &&
    appointmentsInRange.length === 0 &&
    treatments.length === 0;

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        crumb={`/ reports / last ${days} days`}
        title="Reports"
        description={`Snapshot for ${label.toLowerCase()}.`}
        actions={<RangeSelector value={rangeKey} />}
      />

      {/* KPI block */}
      <KpiGrid columns={4}>
        <KpiCell
          label="Revenue"
          value={formatCents(totalRevenueCents)}
          series={revSpark}
          meta={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
        />
        <KpiCell
          label="Appointments"
          value={String(appointmentsInRange.length)}
          series={apptSpark}
          meta={`${appointmentsInRange.filter((a) => a.status === "COMPLETED").length} completed`}
        />
        <KpiCell
          label="New patients"
          value={String(newPatients)}
          meta={
            newPatients === 0 ? "none in this window" : `in last ${days} days`
          }
          subtle={newPatients === 0}
        />
        <KpiCell
          label="Outstanding"
          value={formatCents(outstandingCents)}
          tone={overdueCount > 0 ? "warning" : "default"}
          meta={
            overdueCount > 0
              ? `${overdueCount} overdue`
              : outstandingInvoices.length === 0
                ? "all paid up"
                : `${outstandingInvoices.length} open`
          }
          subtle={outstandingInvoices.length === 0}
        />
      </KpiGrid>

      {noActivity ? (
        <section className="border border-border bg-card p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No activity yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once payments, appointments, and treatments start landing in this
            window, you&apos;ll see breakdowns here.
          </p>
        </section>
      ) : (
        <>
          {/* Revenue */}
          <section className="flex flex-col gap-3">
            <PageHead
              variant="section"
              crumb={`/ revenue / ${bucketByMonth ? "monthly" : "daily"}`}
              title="Revenue"
            />
            <div className="border border-border bg-card p-4 sm:p-6">
              <RevenueChart revenueSeries={revenueSeries} />
            </div>
          </section>

          {/* Appointments per dentist */}
          <section className="flex flex-col gap-3">
            <PageHead
              variant="section"
              crumb="/ appointments / per dentist"
              title="Appointments per dentist"
            />
            <div className="border border-border bg-card p-4 sm:p-6">
              <AppointmentsPerDentistChart
                appointmentsPerDentist={appointmentsPerDentist}
              />
            </div>
          </section>

          {/* Top procedures */}
          <section className="flex flex-col gap-3">
            <PageHead
              variant="section"
              crumb="/ procedures / top by volume"
              title="Top procedures"
            />
            <div className="border border-border bg-card p-4 sm:p-6">
              <TopProceduresChart topProcedures={topProcedures} />
            </div>
          </section>
        </>
      )}

      <Plate
        left={`Reports · ${label.toLowerCase()}`}
        right={`revenue ${formatCents(totalRevenueCents)} · ${appointmentsInRange.length} appts`}
      />
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts.slice(0, -1).join(" ")} ${parts.at(-1)![0]}.`;
}
