import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { InvoiceStatusBadge } from "@/components/app/invoice-status-badge";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata = { title: "My invoices · Banilad Dental Clinic" };

export default async function PatientInvoicesPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) {
    return (
      <div className="space-y-6">
        <PageHeader title="My invoices" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
      </div>
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: { patientId: patient.id, status: { in: ["ISSUED", "PARTIAL", "PAID", "VOID"] } },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      totalCents: true,
      issuedAt: true,
      dueAt: true,
      payments: { select: { amountCents: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My invoices" description="Issued invoices and balances." />

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Receipt className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No invoices yet.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Invoices will show here once the clinic issues them.
            </p>
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
                      href={`/portal/invoices/${inv.id}`}
                      className="font-mono text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {inv.number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {inv.issuedAt ? `Issued ${formatDate(inv.issuedAt)}` : "—"}
                      {inv.dueAt ? ` · Due ${formatDate(inv.dueAt)}` : ""}
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
