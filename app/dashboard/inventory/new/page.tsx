import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHead } from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { InventoryForm } from "../inventory-form";

export const metadata = { title: "New item · Banilad Dental Clinic" };

export default async function NewInventoryItemPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href="/dashboard/inventory">
          <ChevronLeft aria-hidden /> Back to inventory
        </Link>
      </Button>

      <PageHead crumb="/ inventory / new" title="New inventory item" description="Add a stockable item to the clinic's inventory." />

      <Card>
        <CardContent className="pt-6">
          <InventoryForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
