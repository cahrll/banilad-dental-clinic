"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updateInvoiceMetaAction } from "@/lib/actions/invoices";
import { initialInvoiceActionState } from "@/lib/auth/form-state";
import { centsToDecimal, decimalToCents } from "@/lib/money";

export function MetaForm({
  invoiceId,
  discountCents,
  taxCents,
  notes,
  dueAt,
  voided,
}: {
  invoiceId: string;
  discountCents: number;
  taxCents: number;
  notes: string;
  dueAt: string;
  voided: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateInvoiceMetaAction.bind(null, invoiceId),
    initialInvoiceActionState,
  );

  const [discount, setDiscount] = useState(centsToDecimal(discountCents));
  const [tax, setTax] = useState(centsToDecimal(taxCents));

  if (voided) {
    return (
      <p className="text-sm text-muted-foreground">
        This invoice is voided. No further changes are allowed.
      </p>
    );
  }

  return (
    <form action={action}>
      <FieldGroup>
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : state.ok ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Saved.</p>
        ) : null}

        <input type="hidden" name="discountCents" value={decimalToCents(discount)} />
        <input type="hidden" name="taxCents" value={decimalToCents(tax)} />

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="discount">Discount</FieldLabel>
            <Input
              id="discount"
              type="text"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tax">Tax</FieldLabel>
            <Input
              id="tax"
              type="text"
              inputMode="decimal"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="dueAt">Due date</FieldLabel>
          <Input id="dueAt" name="dueAt" type="date" defaultValue={dueAt} />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" name="notes" rows={3} defaultValue={notes} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={pending} className="mt-4 w-full">
        {pending ? "Saving…" : "Save adjustments"}
      </Button>
    </form>
  );
}
