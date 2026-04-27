"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { addInvoiceItemAction } from "@/lib/actions/invoices";
import { initialInvoiceActionState } from "@/lib/auth/form-state";
import { decimalToCents } from "@/lib/money";

export function AddItemDialog({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    addInvoiceItemAction.bind(null, invoiceId),
    initialInvoiceActionState,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.ok) setOpen(false);
  }, [state.ok]);

  const [unitDisplay, setUnitDisplay] = useState("0.00");
  const unitCents = decimalToCents(unitDisplay);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Add line
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add line item</DialogTitle>
          <DialogDescription>
            Quantity × unit price = total. Stored as integer cents.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <FieldGroup>
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" required maxLength={200} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="unit">Unit price</FieldLabel>
                <input type="hidden" name="unitPriceCents" value={unitCents} />
                <Input
                  id="unit"
                  type="text"
                  inputMode="decimal"
                  value={unitDisplay}
                  onChange={(e) => setUnitDisplay(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add line"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
