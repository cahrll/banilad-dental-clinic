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
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { AddItemDialog } from "./add-item-dialog";
import { RemoveItemButton } from "./remove-item-button";
import { MetaForm } from "./meta-form";
import { IssueButton } from "./issue-button";
import { VoidButton } from "./void-button";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { DeletePaymentButton } from "./delete-payment-button";
import { PrintButton } from "./print-button";

export const metadata = { title: "Invoice · Banilad Dental Clinic" };

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  INSURANCE: "Insurance",
  OTHER: "Other",
};

const ITEMS_COLS_EDIT = "56px minmax(0,1.5fr) 110px 120px 36px";
const ITEMS_COLS_READ = "56px minmax(0,1.5fr) 110px 120px";
const PAYMENT_COLS_EDIT = "120px 130px minmax(0,1fr) 120px 36px";
const PAYMENT_COLS_READ = "120px 130px minmax(0,1fr) 120px";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: currentUser } = await requireStaff();
  const { id } = await params;

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
      createdAt: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          user: { select: { email: true } },
        },
      },
      items: { orderBy: { id: "asc" } },
      payments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amountCents: true,
          method: true,
          reference: true,
          paidAt: true,
          recordedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!invoice) notFound();

  const isAdmin = currentUser.role === "ADMIN";
  const editable = invoice.status === "DRAFT";
  const acceptsPayments =
    invoice.status === "ISSUED" || invoice.status === "PARTIAL";
  const paid = invoice.payments.reduce((acc, p) => acc + p.amountCents, 0);
  const balance = Math.max(0, invoice.totalCents - paid);
  const portalEmail = invoice.patient.user.email.startsWith("noportal-")
    ? null
    : invoice.patient.user.email;
  const showItemActions = editable;
  const showPaymentActions = isAdmin;
  const itemsCols = showItemActions ? ITEMS_COLS_EDIT : ITEMS_COLS_READ;
  const paymentCols = showPaymentActions ? PAYMENT_COLS_EDIT : PAYMENT_COLS_READ;

  return (
    <div className="flex flex-col gap-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit font-mono text-[11px] uppercase tracking-wider print:hidden"
      >
        <Link href="/dashboard/billing">
          <ChevronLeft aria-hidden /> Back to billing
        </Link>
      </Button>

      <PageHead
        crumb={`/ billing / ${invoice.number}`}
        title={`For ${invoice.patient.firstName} ${invoice.patient.lastName}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            {invoice.status === "DRAFT" ? (
              <IssueButton invoiceId={invoice.id} />
            ) : null}
            {acceptsPayments ? (
              <RecordPaymentDialog
                invoiceId={invoice.id}
                balanceCents={balance}
              />
            ) : null}
            {invoice.status !== "VOID" ? (
              <VoidButton invoiceId={invoice.id} />
            ) : null}
          </div>
        }
      />

      {/* Status strip */}
      <div
        data-tabular
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        <InvoiceStatusBadge status={invoice.status} />
        {invoice.issuedAt ? (
          <span>· Issued {formatDate(invoice.issuedAt)}</span>
        ) : null}
        {invoice.dueAt ? <span>· Due {formatDate(invoice.dueAt)}</span> : null}
        <span className="ml-auto">{invoice.payments.length} payment{invoice.payments.length === 1 ? "" : "s"} recorded</span>
      </div>

      {/* Totals KPI block */}
      <KpiGrid columns={4}>
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
          label="Paid"
          value={formatCents(paid)}
          meta={
            invoice.payments.length === 0
              ? "no payments yet"
              : `${invoice.payments.length} payment${invoice.payments.length === 1 ? "" : "s"}`
          }
        />
        <KpiCell
          label="Balance"
          value={formatCents(balance)}
          tone={balance > 0 ? "warning" : "success"}
          subtle={balance === 0}
          meta={balance === 0 ? "settled in full" : "open balance"}
        />
      </KpiGrid>

      {/* Line items */}
      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="/ line items"
          title="Line items"
          actions={editable ? <AddItemDialog invoiceId={invoice.id} /> : undefined}
        />
        {invoice.items.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No line items yet. Add one to issue this invoice.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={itemsCols}
              labels={[
                { label: "Qty", align: "right" },
                "Description",
                { label: "Unit", align: "right" },
                { label: "Total", align: "right" },
                ...(showItemActions ? [{ label: "", align: "right" as const }] : []),
              ]}
            />
            {invoice.items.map((item) => (
              <LedgerRow key={item.id} cols={itemsCols}>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {item.quantity}
                </span>
                <LedgerName>{item.description}</LedgerName>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatCents(item.unitPriceCents)}
                </span>
                <LedgerAmt>{formatCents(item.totalCents)}</LedgerAmt>
                {showItemActions ? (
                  <span className="flex justify-end print:hidden">
                    <RemoveItemButton itemId={item.id} />
                  </span>
                ) : null}
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* Payments */}
      <section className="flex flex-col gap-3 print:hidden">
        <PageHead
          variant="section"
          crumb="/ payments"
          title="Payments"
          actions={
            acceptsPayments ? (
              <RecordPaymentDialog
                invoiceId={invoice.id}
                balanceCents={balance}
              />
            ) : undefined
          }
        />
        {invoice.payments.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No payments recorded.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={paymentCols}
              labels={[
                "Paid at",
                "Method",
                "Reference",
                { label: "Amount", align: "right" },
                ...(showPaymentActions ? [{ label: "", align: "right" as const }] : []),
              ]}
            />
            {invoice.payments.map((p) => (
              <LedgerRow key={p.id} cols={paymentCols}>
                <LedgerNum>{formatDate(p.paidAt)}</LedgerNum>
                <span className="text-sm">
                  {PAYMENT_LABELS[p.method] ?? p.method}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {p.reference ?? "—"}
                </span>
                <LedgerAmt>{formatCents(p.amountCents)}</LedgerAmt>
                {showPaymentActions ? (
                  <span className="flex justify-end">
                    <DeletePaymentButton paymentId={p.id} />
                  </span>
                ) : null}
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      {/* Adjustments — inline form, no Card wrapper */}
      <section className="flex flex-col gap-3 print:hidden">
        <PageHead
          variant="section"
          crumb="/ adjustments"
          title="Adjustments"
        />
        <div className="border border-border bg-card p-4 sm:p-6">
          <MetaForm
            invoiceId={invoice.id}
            discountCents={invoice.discountCents}
            taxCents={invoice.taxCents}
            notes={invoice.notes ?? ""}
            dueAt={
              invoice.dueAt ? invoice.dueAt.toISOString().slice(0, 10) : ""
            }
            voided={invoice.status === "VOID"}
          />
        </div>
      </section>

      {invoice.notes ? (
        <section className="flex flex-col gap-3">
          <PageHead
            variant="section"
            crumb="/ notes"
            title="Notes"
          />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {invoice.notes}
          </p>
        </section>
      ) : null}

      {/* Bill-to — print only */}
      <section className="hidden flex-col gap-3 print:flex">
        <PageHead variant="section" crumb="/ bill to" title="Bill to" />
        <div className="text-sm leading-relaxed">
          <p className="font-medium">
            {invoice.patient.firstName} {invoice.patient.lastName}
          </p>
          {portalEmail ? <p>{portalEmail}</p> : null}
          {invoice.patient.phone ? <p>{invoice.patient.phone}</p> : null}
          {invoice.patient.address ? (
            <p className="whitespace-pre-wrap">{invoice.patient.address}</p>
          ) : null}
        </div>
      </section>

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
