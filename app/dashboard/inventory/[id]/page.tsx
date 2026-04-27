import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  IN: "text-emerald-700 dark:text-emerald-400",
  OUT: "text-rose-700 dark:text-rose-400",
  ADJUSTMENT: "text-amber-700 dark:text-amber-400",
};

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
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/dashboard/inventory">
          <ChevronLeft aria-hidden /> Back to inventory
        </Link>
      </Button>

      <PageHeader
        title={item.name}
        description={item.sku ? `SKU ${item.sku}` : item.supplier ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {item.isActive ? (
              <RecordMovementDialog itemId={item.id} stockOnHand={item.stockOnHand} />
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/inventory/${item.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            <ToggleActiveButton itemId={item.id} isActive={item.isActive} />
            {isAdmin ? <DeleteItemButton itemId={item.id} /> : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={low ? "border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Stock on hand
              {low ? <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden /> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {item.stockOnHand}{" "}
              <span className="text-base font-normal text-muted-foreground">{item.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reorder at {item.reorderPoint} {item.unit}
              {low ? " · below threshold" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCents(item.unitCostCents)}</p>
            <p className="mt-1 text-xs text-muted-foreground">per {item.unit}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              On-hand value: {formatCents(item.stockOnHand * item.unitCostCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {item.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
            {item.supplier ? (
              <p className="mt-2 text-xs text-muted-foreground">Supplier: {item.supplier}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movements</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {item.movements.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No movements recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="hidden sm:table-cell">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.recordedAt)}</TableCell>
                      <TableCell className={MOVEMENT_TONE[m.type] ?? ""}>
                        {MOVEMENT_LABEL[m.type] ?? m.type}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${MOVEMENT_TONE[m.type] ?? ""}`}>
                        {sign}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.reason ?? "—"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {m.recordedBy.name}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {item.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
          </CardContent>
        </Card>
      ) : null}
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
