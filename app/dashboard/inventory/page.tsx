import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerName,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { InventorySearchInput } from "./search-input";
import { InventoryShowInactiveToggle } from "./show-inactive-toggle";

export const metadata = { title: "Inventory · Banilad Dental Clinic" };

type SearchParams = { q?: string; inactive?: string };

const COLS =
  "minmax(0,2fr) 100px 70px 70px 110px 90px";

export default async function InventoryListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { q, inactive } = await searchParams;
  const query = q?.trim() ?? "";
  const showInactive = inactive === "1";

  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(showInactive ? {} : { isActive: true }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { supplier: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      stockOnHand: true,
      reorderPoint: true,
      unitCostCents: true,
      supplier: true,
      isActive: true,
    },
  });

  const lowStockCount = items.filter(
    (i) => i.isActive && i.stockOnHand <= i.reorderPoint,
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        crumb={`/ inventory${query ? ` / "${query}"` : ""}`}
        title="Inventory"
        description={`${items.length}${items.length === 200 ? "+" : ""} item${items.length === 1 ? "" : "s"}${lowStockCount > 0 ? ` · ${lowStockCount} at or below reorder point` : ""}`}
        actions={
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/dashboard/inventory/new">
              <Plus aria-hidden /> New item
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InventorySearchInput defaultValue={query} />
        <InventoryShowInactiveToggle defaultChecked={showInactive} query={query} />
      </div>

      {items.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {query
            ? "No matches. Try a different search."
            : "No items yet. Add your first to start tracking stock."}
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Item",
              "SKU",
              { label: "Stock", align: "right" },
              { label: "Reorder", align: "right" },
              { label: "Unit cost", align: "right" },
              { label: "Status", align: "right" },
            ]}
          />
          {items.map((it) => {
            const low = it.isActive && it.stockOnHand <= it.reorderPoint;
            return (
              <LedgerRow
                key={it.id}
                cols={COLS}
                href={`/dashboard/inventory/${it.id}`}
              >
                <LedgerName sub={`· ${it.unit}`}>{it.name}</LedgerName>
                <span className="truncate font-mono text-xs uppercase tracking-wider tabular-nums text-muted-foreground">
                  {it.sku ?? "—"}
                </span>
                <span
                  className={cn(
                    "text-right font-mono text-sm tabular-nums",
                    low ? "font-semibold text-warning" : "",
                  )}
                >
                  {it.stockOnHand}
                  {low ? (
                    <AlertTriangle
                      aria-label="Low stock"
                      className="ml-1 inline-block size-3 align-baseline text-warning"
                    />
                  ) : null}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {it.reorderPoint}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatCents(it.unitCostCents)}
                </span>
                <span
                  className={cn(
                    "text-right font-mono text-[10px] uppercase tracking-wider",
                    it.isActive ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {it.isActive ? "Active" : "Inactive"}
                </span>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left="Inventory · stock register"
        right={`${items.length} item${items.length === 1 ? "" : "s"} listed · ${lowStockCount} low`}
      />
    </div>
  );
}
