"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { issueInvoiceAction } from "@/lib/actions/invoices";

export function IssueButton({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send aria-hidden /> Issue invoice
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue this invoice?</DialogTitle>
          <DialogDescription>
            Once issued, line items can no longer be edited. The invoice can still be voided or accept payments.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await issueInvoiceAction(invoiceId);
                if (!res.ok) setError(res.error ?? "Couldn't issue.");
                else setOpen(false);
              })
            }
          >
            {pending ? "Issuing…" : "Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
