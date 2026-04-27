import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  CreditCard,
  Package,
  Receipt,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/app/role-badge";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { firstName } from "@/lib/utils";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Dashboard · Banilad Dental Clinic" };

export default async function DashboardHome() {
  const { user } = await requireStaff();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    todayAppointmentsCount,
    upcomingCount,
    activePatientsCount,
    outstandingInvoices,
    lowStockItems,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        startsAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] },
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
  ]);

  const outstandingCents = outstandingInvoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((p, x) => p + x.amountCents, 0);
    return acc + Math.max(0, inv.totalCents - paid);
  }, 0);

  const lowStock = lowStockItems.filter((i) => i.stockOnHand <= i.reorderPoint);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
          <span className="text-sm text-muted-foreground">Signed in as {user.email}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {firstName(user.name)}.
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={CalendarRange}
          label="Today's appointments"
          value={String(todayAppointmentsCount)}
          href="/dashboard/appointments"
        />
        <StatCard
          Icon={CalendarRange}
          label="Upcoming"
          value={String(upcomingCount)}
          href="/dashboard/appointments"
        />
        <StatCard
          Icon={Users}
          label="Active patients"
          value={String(activePatientsCount)}
          href="/dashboard/patients"
        />
        <StatCard
          Icon={Receipt}
          label="Outstanding"
          value={formatCents(outstandingCents)}
          subtle={outstandingInvoices.length === 0}
          href="/dashboard/billing?status=ISSUED"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
              Low stock
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/inventory">Open inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing below reorder point. Inventory is healthy.
              </p>
            ) : (
              <ul className="divide-y">
                {lowStock.map((it) => (
                  <li key={it.id} className="flex items-center justify-between py-2">
                    <Link
                      href={`/dashboard/inventory/${it.id}`}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {it.name}
                    </Link>
                    <span className="text-sm">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {it.stockOnHand}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        / {it.reorderPoint} {it.unit}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <QuickLink href="/dashboard/patients/new" Icon={Users} label="New patient" />
            <QuickLink href="/dashboard/appointments" Icon={CalendarRange} label="Calendar" />
            <QuickLink href="/dashboard/billing" Icon={CreditCard} label="Billing" />
            <QuickLink href="/dashboard/inventory" Icon={Package} label="Inventory" />
            <QuickLink href="/dashboard/patients" Icon={Stethoscope} label="Treatments" />
            {user.role === "ADMIN" ? (
              <QuickLink href="/dashboard/staff" Icon={UserCog} label="Staff" />
            ) : null}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  subtle,
  href,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  subtle?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-start gap-3 py-5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p
              className={
                subtle
                  ? "text-2xl font-semibold text-muted-foreground"
                  : "text-2xl font-semibold"
              }
            >
              {value}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickLink({
  href,
  Icon,
  label,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className="justify-start">
      <Link href={href}>
        <Icon aria-hidden /> {label}
      </Link>
    </Button>
  );
}
