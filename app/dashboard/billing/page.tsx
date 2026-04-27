import Link from "next/link";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { InvoiceStatus } from "@/generated/prisma/client";

export const metadata = { title: "Billing · Banilad Dental Clinic" };

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIAL", "PAID", "VOID"];

type SearchParams = { status?: string };

export default async function BillingListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { status: statusParam } = await searchParams;
  const filter = STATUSES.includes(statusParam as InvoiceStatus)
    ? (statusParam as InvoiceStatus)
    : undefined;

  const invoices = await prisma.invoice.findMany({
    where: filter ? { status: filter } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      totalCents: true,
      issuedAt: true,
      dueAt: true,
      createdAt: true,
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      payments: { select: { amountCents: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={`${invoices.length}${invoices.length === 100 ? "+" : ""} invoice${invoices.length === 1 ? "" : "s"}${filter ? ` · ${filter.toLowerCase()}` : ""}`}
      />

      <div className="flex flex-wrap gap-2">
        <FilterPill href="/dashboard/billing" label="All" active={!filter} />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={`/dashboard/billing?status=${s}`}
            label={s.charAt(0) + s.slice(1).toLowerCase()}
            active={filter === s}
          />
        ))}
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Receipt className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No invoices found.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Open a patient and create an invoice from the Invoices tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="hidden md:table-cell">Issued</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((acc, p) => acc + p.amountCents, 0);
                const balance = Math.max(0, inv.totalCents - paid);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/dashboard/billing/${inv.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/patients/${inv.patient.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {inv.patient.lastName}, {inv.patient.firstName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCents(inv.totalCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {balance === 0 && inv.totalCents > 0 ? (
                        <span className="text-muted-foreground">Settled</span>
                      ) : (
                        formatCents(balance)
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {inv.issuedAt ? formatDate(inv.issuedAt) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Button asChild variant={active ? "default" : "outline"} size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
