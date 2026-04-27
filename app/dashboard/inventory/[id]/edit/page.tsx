import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { InventoryForm, type InventoryFormDefaults } from "../../inventory-form";

export const metadata = { title: "Edit item · Banilad Dental Clinic" };

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
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
    },
  });

  if (!item) notFound();

  const defaults: InventoryFormDefaults = {
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    stockOnHand: item.stockOnHand,
    reorderPoint: item.reorderPoint,
    unitCostCents: item.unitCostCents,
    supplier: item.supplier,
    notes: item.notes,
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/dashboard/inventory/${item.id}`}>
          <ChevronLeft aria-hidden /> Back to item
        </Link>
      </Button>

      <PageHeader title={`Edit ${item.name}`} />

      <Card>
        <CardContent className="pt-6">
          <InventoryForm mode="edit" itemId={item.id} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
