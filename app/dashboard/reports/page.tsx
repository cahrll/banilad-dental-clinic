import { CalendarRange, Receipt, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { RangeSelector } from "./range-selector";
import { ReportsCharts } from "./reports-charts";

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
      select: { dentistId: true, status: true },
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

  const revenueSeries = Array.from(revenueBuckets.entries()).map(([k, cents]) => ({
    bucket: k,
    label: bucketByMonth ? formatMonthLabel(k) : formatDayLabel(k),
    cents,
    amount: cents / 100,
  }));

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Snapshot for ${label.toLowerCase()}.`}
        actions={<RangeSelector value={rangeKey} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          Icon={TrendingUp}
          label="Revenue"
          value={formatCents(totalRevenueCents)}
          sub={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
        />
        <KpiCard
          Icon={CalendarRange}
          label="Appointments"
          value={String(appointmentsInRange.length)}
          sub={`${appointmentsInRange.filter((a) => a.status === "COMPLETED").length} completed`}
        />
        <KpiCard
          Icon={Users}
          label="New patients"
          value={String(newPatients)}
        />
        <KpiCard
          Icon={Receipt}
          label="Outstanding"
          value={formatCents(outstandingCents)}
          sub={
            overdueCount > 0
              ? `${overdueCount} overdue`
              : outstandingInvoices.length === 0
                ? "All paid up"
                : `${outstandingInvoices.length} open`
          }
          tone={overdueCount > 0 ? "warning" : undefined}
        />
      </section>

      {payments.length === 0 &&
      appointmentsInRange.length === 0 &&
      treatments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No activity yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once payments, appointments, and treatments start landing in this
              window, you&apos;ll see breakdowns here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ReportsCharts
          revenueSeries={revenueSeries}
          appointmentsPerDentist={appointmentsPerDentist}
          topProcedures={topProcedures}
          bucketByMonth={bucketByMonth}
        />
      )}
    </div>
  );
}

function KpiCard({
  Icon,
  label,
  value,
  sub,
  tone,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  sub?: string;
  tone?: "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-5">
        <span
          className={
            tone === "warning"
              ? "grid size-9 place-items-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "grid size-9 place-items-center rounded-md bg-primary/10 text-primary"
          }
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold">{value}</p>
          {sub ? (
            <p className="truncate text-xs text-muted-foreground">{sub}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- helpers ----------

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
  // "Dr. Dana Dentist" -> "Dr. Dana D." for chart labels.
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  return `${parts.slice(0, -1).join(" ")} ${parts.at(-1)![0]}.`;
}
