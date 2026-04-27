"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePaymentAction } from "@/lib/actions/invoices";

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete payment"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deletePaymentAction(paymentId);
        })
      }
    >
      <Trash2 aria-hidden />
    </Button>
  );
}
