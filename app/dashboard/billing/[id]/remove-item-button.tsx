"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeInvoiceItemAction } from "@/lib/actions/invoices";

export function RemoveItemButton({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Remove line item"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await removeInvoiceItemAction(itemId);
        });
      }}
    >
      <X aria-hidden />
    </Button>
  );
}
