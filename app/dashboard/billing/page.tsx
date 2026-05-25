import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerName,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/generated/prisma/client";

export const metadata = { title: "Billing · Banilad Dental Clinic" };

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PARTIAL", "PAID", "VOID"];

type SearchParams = { status?: string };

const COLS = "110px minmax(0,1.4fr) 90px 130px 130px 110px";

const STATUS_TONE: Record<InvoiceStatus, string> = {
  DRAFT: "text-muted-foreground",
  ISSUED: "text-info",
  PARTIAL: "text-warning",
  PAID: "text-success",
  VOID: "text-muted-foreground line-through",
};

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
    <div className="flex flex-col gap-8">
      <PageHead
        crumb={`/ billing${filter ? ` / ${filter.toLowerCase()}` : ""}`}
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
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          No invoices found. Open a patient and create an invoice from the
          Invoices section.
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Invoice",
              "Patient",
              { label: "Status", align: "right" },
              { label: "Total", align: "right" },
              { label: "Balance", align: "right" },
              "Issued",
            ]}
          />
          {invoices.map((inv) => {
            const paid = inv.payments.reduce(
              (acc, p) => acc + p.amountCents,
              0,
            );
            const balance = Math.max(0, inv.totalCents - paid);
            return (
              <LedgerRow
                key={inv.id}
                cols={COLS}
                href={`/dashboard/billing/${inv.id}`}
              >
                <LedgerNum>{inv.number}</LedgerNum>
                <LedgerName>
                  {inv.patient.lastName}, {inv.patient.firstName}
                </LedgerName>
                <span
                  className={cn(
                    "text-right font-mono text-[10px] uppercase tracking-wider",
                    STATUS_TONE[inv.status],
                  )}
                >
                  {inv.status.toLowerCase()}
                </span>
                <span className="text-right font-mono text-sm tabular-nums">
                  {formatCents(inv.totalCents)}
                </span>
                <span
                  className={cn(
                    "text-right font-mono text-sm tabular-nums",
                    balance === 0 && inv.totalCents > 0
                      ? "text-muted-foreground"
                      : balance > 0
                        ? "text-warning"
                        : "",
                  )}
                >
                  {balance === 0 && inv.totalCents > 0
                    ? "settled"
                    : formatCents(balance)}
                </span>
                <LedgerNum>
                  {inv.issuedAt ? formatDate(inv.issuedAt) : "—"}
                </LedgerNum>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left={`Billing · ${filter ? filter.toLowerCase() : "all"}`}
        right={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} listed`}
      />
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
    <Button
      asChild
      variant={active ? "default" : "outline"}
      size="sm"
      className="rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
    >
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
