import Link from "next/link";
import { CalendarRange, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { firstName } from "@/lib/utils";
import { formatCents } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";

export const metadata = { title: "My portal · Banilad Dental Clinic" };

export default async function PortalHome() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  const displayName = patient?.firstName ?? firstName(user.name);

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Hello, {displayName}.</h1>
        </header>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
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
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Hello, {displayName}.</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your care.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          Icon={CalendarRange}
          label="Upcoming visits"
          value={String(upcoming.length)}
          href="/portal/appointments"
        />
        <SummaryCard
          Icon={FileText}
          label="Treatments on record"
          value={String(recentTreatmentCount)}
        />
        <SummaryCard
          Icon={Receipt}
          label="Outstanding"
          value={formatCents(outstandingCents)}
          subtle={outstandingCents === 0}
          href="/portal/invoices"
        />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming appointments</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/portal/appointments">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any upcoming visits.{" "}
              <Link
                href="/portal/appointments"
                className="underline underline-offset-4"
              >
                Book one now
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatDateTime(a.startsAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      With {a.dentist.user.name}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
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
  href?: string;
}) {
  const inner = (
    <Card className={href ? "transition-colors group-hover:border-primary/40" : ""}>
      <CardContent className="flex items-start gap-3 py-5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={
              subtle ? "text-2xl font-semibold text-muted-foreground" : "text-2xl font-semibold"
            }
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
