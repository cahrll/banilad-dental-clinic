import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerAmt,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@prisma/client";

export const metadata = { title: "My invoices · Banilad Dental Clinic" };

const COLS = "110px 110px 110px minmax(0,1fr) 90px";

export default async function PatientInvoicesPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead crumb="/ invoices" title="My invoices" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Your patient record isn&apos;t set up yet. Please contact the clinic.
        </p>
      </div>
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      patientId: patient.id,
      status: { in: ["ISSUED", "PARTIAL", "PAID", "VOID"] },
    },
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

  const totalOutstanding = invoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amountCents, 0);
    return acc + Math.max(0, inv.totalCents - paid);
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        crumb="/ invoices"
        title="My invoices"
        description="Issued invoices and balances."
      />

      {invoices.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          No invoices yet. They&apos;ll show here once the clinic issues them.
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Invoice",
              "Issued",
              "Due",
              { label: "Total", align: "right" },
              { label: "Status", align: "right" },
            ]}
          />
          {invoices.map((inv) => {
            const paid = inv.payments.reduce((acc, p) => acc + p.amountCents, 0);
            const balance = Math.max(0, inv.totalCents - paid);
            return (
              <LedgerRow
                key={inv.id}
                cols={COLS}
                href={`/portal/invoices/${inv.id}`}
              >
                <LedgerNum>{inv.number}</LedgerNum>
                <LedgerNum>
                  {inv.issuedAt ? formatDate(inv.issuedAt) : "—"}
                </LedgerNum>
                <LedgerNum>{inv.dueAt ? formatDate(inv.dueAt) : "—"}</LedgerNum>
                <LedgerAmt
                  balance={balance > 0 ? `bal ${formatCents(balance)}` : "settled"}
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

      <Plate
        left="Invoices · billing history"
        right={
          totalOutstanding > 0
            ? `${formatCents(totalOutstanding)} outstanding`
            : "all settled"
        }
      />
    </div>
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

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
