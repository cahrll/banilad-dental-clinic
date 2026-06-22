import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiGrid,
  KpiCell,
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerMeta,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { RecordMovementDialog } from "./record-movement-dialog";
import { ToggleActiveButton } from "./toggle-active-button";
import { DeleteItemButton } from "./delete-item-button";

export const metadata = { title: "Inventory item · Banilad Dental Clinic" };

const MOVEMENT_LABEL: Record<string, string> = {
  IN: "Stock in",
  OUT: "Stock out",
  ADJUSTMENT: "Adjustment",
};

const MOVEMENT_TONE: Record<string, string> = {
  IN: "text-success",
  OUT: "text-destructive",
  ADJUSTMENT: "text-warning",
};

const MOVEMENT_COLS = "150px 110px 70px minmax(0,1.4fr) minmax(0,1fr)";

export default async function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: currentUser } = await requireStaff();
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      stockOnHand: true,
      reorderPoint: true,
      unitCostCents: true,
      supplier: true,
      notes: true,
      isActive: true,
      createdAt: true,
      movements: {
        orderBy: { recordedAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          recordedAt: true,
          recordedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!item) notFound();

  const low = item.isActive && item.stockOnHand <= item.reorderPoint;
  const isAdmin = currentUser.role === "ADMIN";

  return (
    <div className="flex flex-col gap-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit font-mono text-[11px] uppercase tracking-wider"
      >
        <Link href="/dashboard/inventory">
          <ChevronLeft aria-hidden /> Back to inventory
        </Link>
      </Button>

      <PageHead
        crumb={`/ inventory / ${item.sku ?? slug(item.name)}`}
        title={item.name}
        description={item.sku ? `SKU ${item.sku}` : item.supplier ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {item.isActive ? (
              <RecordMovementDialog
                itemId={item.id}
                stockOnHand={item.stockOnHand}
              />
            ) : null}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href={`/dashboard/inventory/${item.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            <ToggleActiveButton itemId={item.id} isActive={item.isActive} />
            {isAdmin ? <DeleteItemButton itemId={item.id} /> : null}
          </div>
        }
      />

      <KpiGrid columns={3}>
        <KpiCell
          label={`Stock on hand · ${item.unit}`}
          value={String(item.stockOnHand)}
          tone={low ? "warning" : "default"}
          meta={`Reorder at ${item.reorderPoint} ${item.unit}${low ? " · below threshold" : ""}`}
        />
        <KpiCell
          label="Unit cost"
          value={formatCents(item.unitCostCents)}
          meta={`On-hand value ${formatCents(item.stockOnHand * item.unitCostCents)}`}
        />
        <KpiCell
          label="Status"
          value={item.isActive ? "Active" : "Inactive"}
          subtle={!item.isActive}
          meta={item.supplier ? `Supplier · ${item.supplier}` : undefined}
        />
      </KpiGrid>

      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 01 / movements"
          title="Movements"
        />
        {item.movements.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No movements recorded.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={MOVEMENT_COLS}
              labels={[
                "Date",
                "Type",
                { label: "Qty", align: "right" },
                "Reason",
                "By",
              ]}
            />
            {item.movements.map((m) => {
              const sign =
                m.type === "IN"
                  ? "+"
                  : m.type === "OUT"
                    ? "−"
                    : (m.reason ?? "").startsWith("(decrease)")
                      ? "−"
                      : "+";
              return (
                <LedgerRow key={m.id} cols={MOVEMENT_COLS}>
                  <LedgerNum>{formatDate(m.recordedAt)}</LedgerNum>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      MOVEMENT_TONE[m.type] ?? "",
                    )}
                  >
                    {MOVEMENT_LABEL[m.type] ?? m.type}
                  </span>
                  <span
                    className={cn(
                      "text-right font-mono text-sm font-semibold tabular-nums",
                      MOVEMENT_TONE[m.type] ?? "",
                    )}
                  >
                    {sign}
                    {m.quantity}
                  </span>
                  <LedgerMeta>{m.reason ?? "—"}</LedgerMeta>
                  <LedgerMeta>{m.recordedBy.name}</LedgerMeta>
                </LedgerRow>
              );
            })}
          </Ledger>
        )}
      </section>

      {item.notes ? (
        <section className="flex flex-col gap-3">
          <PageHead variant="section" crumb="§ 02 / notes" title="Notes" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {item.notes}
          </p>
        </section>
      ) : null}

      <Plate
        left={`Item · ${item.name}`}
        right={`${item.stockOnHand} ${item.unit} on hand${low ? " · low" : ""}`}
      />
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
