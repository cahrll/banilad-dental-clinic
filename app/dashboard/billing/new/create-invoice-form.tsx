"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { createDraftInvoiceAction } from "@/lib/actions/invoices";
import { initialInvoiceFormState } from "@/lib/auth/form-state";
import { formatCents } from "@/lib/money";

export function CreateInvoiceForm({
  patientId,
  seedTreatments,
}: {
  patientId: string;
  seedTreatments: Array<{ id: string; procedure: string; feeCents: number; performedAt: string }>;
}) {
  const [state, action, pending] = useActionState(
    createDraftInvoiceAction,
    initialInvoiceFormState,
  );

  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(seedTreatments.map((t) => t.id)),
  );

  const total = seedTreatments
    .filter((t) => included.has(t.id))
    .reduce((acc, t) => acc + t.feeCents, 0);

  return (
    <form action={action}>
      <input type="hidden" name="patientId" value={patientId} />
      <input
        type="hidden"
        name="treatmentIds"
        value={Array.from(included).join(",")}
      />

      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        {seedTreatments.length > 0 ? (
          <Field>
            <FieldLabel>Seed line items from treatments</FieldLabel>
            <FieldDescription>
              Selected treatments become the initial line items. You can edit them after the draft is created.
            </FieldDescription>
            <div className="space-y-1.5 rounded-md border bg-muted/20 p-3">
              {seedTreatments.map((t) => {
                const checked = included.has(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm hover:bg-background"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input"
                        checked={checked}
                        onChange={(e) => {
                          setIncluded((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        {t.procedure}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {t.performedAt.slice(0, 10)}
                        </span>
                      </span>
                    </span>
                    <span className="font-medium">{formatCents(t.feeCents)}</span>
                  </label>
                );
              })}
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCents(total)}</span>
              </div>
            </div>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </FieldGroup>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create draft invoice"}
        </Button>
      </div>
    </form>
  );
}
