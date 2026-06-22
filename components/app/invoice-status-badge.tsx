import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@prisma/client";

const labels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PAID: "Paid",
  PARTIAL: "Partial",
  VOID: "Void",
};

const tones: Record<InvoiceStatus, string> = {
  DRAFT: "border-border bg-muted text-muted-foreground",
  ISSUED: "border-info/40 bg-info/10 text-info",
  PAID: "border-success/40 bg-success/10 text-success",
  PARTIAL: "border-warning/40 bg-warning/10 text-warning",
  VOID: "border-border bg-muted text-muted-foreground line-through",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", tones[status])}>
      {labels[status]}
    </Badge>
  );
}
