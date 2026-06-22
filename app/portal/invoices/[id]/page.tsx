import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiGrid,
  KpiCell,
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerName,
  LedgerNum,
  LedgerAmt,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { InvoiceStatusBadge } from "@/components/app/invoice-status-badge";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Invoice · Banilad Dental Clinic" };

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

const ITEMS_COLS = "56px minmax(0,1.5fr) 120px";
const PAYMENT_COLS = "130px 130px 120px";

export default async function PatientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requirePatient();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      subtotalCents: true,
      discountCents: true,
      taxCents: true,
      totalCents: true,
      notes: true,
      patientId: true,
      items: { orderBy: { id: "asc" } },
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, amountCents: true, method: true, paidAt: true },
      },
    },
  });

  if (!invoice || invoice.patientId !== patient.id) notFound();
  if (invoice.status === "DRAFT") notFound();

  const paid = invoice.payments.reduce((acc, p) => acc + p.amountCents, 0);
  const balance = Math.max(0, invoice.totalCents - paid);

  return (
    <div className="flex flex-col gap-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit font-mono text-[11px] uppercase tracking-wider"
      >
        <Link href="/portal/invoices">
          <ChevronLeft aria-hidden /> Back to invoices
        </Link>
      </Button>

      <PageHead
        crumb={`/ invoice / ${invoice.number}`}
        title={invoice.number}
        description={
          invoice.issuedAt ? `Issued ${formatDate(invoice.issuedAt)}` : undefined
        }
      />

      {/* Status strip */}
      <div
        data-tabular
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        <InvoiceStatusBadge status={invoice.status} />
        {invoice.dueAt ? <span>· Due {formatDate(invoice.dueAt)}</span> : null}
        <span className="ml-auto">{invoice.payments.length} payment{invoice.payments.length === 1 ? "" : "s"} recorded</span>
      </div>

      {/* Totals */}
      <KpiGrid columns={3}>
        <KpiCell label="Subtotal" value={formatCents(invoice.subtotalCents)} />
        <KpiCell
          label="Total"
          value={formatCents(invoice.totalCents)}
          meta={
            invoice.discountCents + invoice.taxCents > 0
              ? `disc ${formatCents(invoice.discountCents)} · tax ${formatCents(invoice.taxCents)}`
              : "no adjustments"
          }
        />
        <KpiCell
          label="Balance"
          value={formatCents(balance)}
          tone={balance > 0 ? "warning" : "success"}
          subtle={balance === 0}
          meta={balance === 0 ? "settled in full" : `${formatCents(paid)} paid`}
        />
      </KpiGrid>

      {/* Line items */}
      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="/ line items"
          title="Line items"
        />
        {invoice.items.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No line items on this invoice.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={ITEMS_COLS}
              labels={[
                { label: "Qty", align: "right" },
                "Description",
                { label: "Total", align: "right" },
              ]}
            />
            {invoice.items.map((item) => (
              <LedgerRow key={item.id} cols={ITEMS_COLS}>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {item.quantity}
                </span>
                <LedgerName>{item.description}</LedgerName>
                <LedgerAmt>{formatCents(item.totalCents)}</LedgerAmt>
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* Payments */}
      {invoice.payments.length > 0 ? (
        <section className="flex flex-col gap-3">
          <PageHead
            variant="section"
            crumb="/ payments"
            title="Payments"
          />
          <Ledger>
            <LedgerHead
              cols={PAYMENT_COLS}
              labels={[
                "Paid at",
                "Method",
                { label: "Amount", align: "right" },
              ]}
            />
            {invoice.payments.map((p) => (
              <LedgerRow key={p.id} cols={PAYMENT_COLS}>
                <LedgerNum>{formatDate(p.paidAt)}</LedgerNum>
                <span className="text-sm">
                  {PAYMENT_LABELS[p.method] ?? p.method}
                </span>
                <LedgerAmt>{formatCents(p.amountCents)}</LedgerAmt>
              </LedgerRow>
            ))}
          </Ledger>
        </section>
      ) : null}

      {invoice.notes ? (
        <section className="flex flex-col gap-3">
          <PageHead variant="section" crumb="/ notes" title="Notes" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {invoice.notes}
          </p>
        </section>
      ) : null}

      <Plate
        left={`Invoice · ${invoice.number}`}
        right={`balance ${formatCents(balance)} · ${invoice.status.toLowerCase()}`}
      />
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
