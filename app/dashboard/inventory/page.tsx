import Link from "next/link";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { InventorySearchInput } from "./search-input";
import { InventoryShowInactiveToggle } from "./show-inactive-toggle";

export const metadata = { title: "Inventory · Banilad Dental Clinic" };

type SearchParams = { q?: string; inactive?: string };

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
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${items.length}${items.length === 200 ? "+" : ""} item${items.length === 1 ? "" : "s"}${lowStockCount > 0 ? ` · ${lowStockCount} at or below reorder point` : ""}`}
        actions={
          <Button asChild size="sm">
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
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Package className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No items found.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query ? "Try a different search term." : "Add your first item to start tracking stock."}
            </p>
            {!query ? (
              <Button asChild className="mt-2">
                <Link href="/dashboard/inventory/new">Add item</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="hidden md:table-cell text-right">Reorder at</TableHead>
                <TableHead className="hidden md:table-cell text-right">Unit cost</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const low = it.isActive && it.stockOnHand <= it.reorderPoint;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/inventory/${it.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {it.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{it.unit}</p>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">
                      {it.sku ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={low ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                        {it.stockOnHand}
                      </span>
                      {low ? (
                        <span className="ml-1 inline-flex items-center align-middle text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3.5" aria-label="Low stock" />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell text-muted-foreground">
                      {it.reorderPoint}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {formatCents(it.unitCostCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
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
