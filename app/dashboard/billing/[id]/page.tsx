import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
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
  const acceptsPayments = invoice.status === "ISSUED" || invoice.status === "PARTIAL";
  const paid = invoice.payments.reduce((acc, p) => acc + p.amountCents, 0);
  const balance = Math.max(0, invoice.totalCents - paid);
  const portalEmail = invoice.patient.user.email.startsWith("noportal-")
    ? null
    : invoice.patient.user.email;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit print:hidden">
        <Link href="/dashboard/billing">
          <ChevronLeft aria-hidden /> Back to billing
        </Link>
      </Button>

      <PageHeader
        title={invoice.number}
        description={`For ${invoice.patient.firstName} ${invoice.patient.lastName}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <PrintButton />
            {invoice.status === "DRAFT" ? <IssueButton invoiceId={invoice.id} /> : null}
            {acceptsPayments ? <RecordPaymentDialog invoiceId={invoice.id} balanceCents={balance} /> : null}
            {invoice.status !== "VOID" ? <VoidButton invoiceId={invoice.id} /> : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground print:hidden">
        <InvoiceStatusBadge status={invoice.status} />
        {invoice.issuedAt ? <span>· Issued {formatDate(invoice.issuedAt)}</span> : null}
        {invoice.dueAt ? <span>· Due {formatDate(invoice.dueAt)}</span> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 print:grid-cols-3">
        <Card className="lg:col-span-2 print:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line items</CardTitle>
            {editable ? <AddItemDialog invoiceId={invoice.id} /> : null}
          </CardHeader>
          <CardContent className="px-0">
            {invoice.items.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No line items yet. Add one to issue this invoice.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {editable ? <TableHead aria-label="Actions" className="print:hidden" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCents(item.unitPriceCents)}</TableCell>
                      <TableCell className="text-right">{formatCents(item.totalCents)}</TableCell>
                      {editable ? (
                        <TableCell className="text-right print:hidden">
                          <RemoveItemButton itemId={item.id} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCents(invoice.subtotalCents)} />
            <Row label="Discount" value={`- ${formatCents(invoice.discountCents)}`} muted />
            <Row label="Tax" value={`+ ${formatCents(invoice.taxCents)}`} muted />
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatCents(invoice.totalCents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span>{formatCents(paid)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Balance</span>
              <span className={balance > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "font-medium text-emerald-600 dark:text-emerald-400"}>
                {formatCents(balance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 print:hidden">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {invoice.payments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No payments recorded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paid at</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isAdmin ? <TableHead aria-label="Actions" /> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.paidAt)}</TableCell>
                      <TableCell>{PAYMENT_LABELS[p.method] ?? p.method}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCents(p.amountCents)}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <DeletePaymentButton paymentId={p.id} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <MetaForm
              invoiceId={invoice.id}
              discountCents={invoice.discountCents}
              taxCents={invoice.taxCents}
              notes={invoice.notes ?? ""}
              dueAt={invoice.dueAt ? invoice.dueAt.toISOString().slice(0, 10) : ""}
              voided={invoice.status === "VOID"}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="hidden print:block">
        <CardHeader>
          <CardTitle>Bill to</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{invoice.patient.firstName} {invoice.patient.lastName}</p>
          {portalEmail ? <p>{portalEmail}</p> : null}
          {invoice.patient.phone ? <p>{invoice.patient.phone}</p> : null}
          {invoice.patient.address ? <p className="whitespace-pre-wrap">{invoice.patient.address}</p> : null}
        </CardContent>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : ""}>{value}</span>
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
