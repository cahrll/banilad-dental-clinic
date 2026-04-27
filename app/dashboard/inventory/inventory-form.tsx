"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
} from "@/lib/actions/inventory";
import {
  initialInventoryFormState,
  toFieldErrors,
} from "@/lib/auth/form-state";
import { centsToDecimal, decimalToCents } from "@/lib/money";

export type InventoryFormDefaults = {
  name: string;
  sku: string | null;
  unit: string;
  stockOnHand: number;
  reorderPoint: number;
  unitCostCents: number;
  supplier: string | null;
  notes: string | null;
};

export function InventoryForm({
  mode,
  itemId,
  defaults,
}: {
  mode: "create" | "edit";
  itemId?: string;
  defaults?: InventoryFormDefaults;
}) {
  const action =
    mode === "edit" && itemId
      ? updateInventoryItemAction.bind(null, itemId)
      : createInventoryItemAction;
  const [state, formAction, pending] = useActionState(action, initialInventoryFormState);

  const [unitCost, setUnitCost] = useState(centsToDecimal(defaults?.unitCostCents ?? 0));

  return (
    <form action={formAction}>
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <input type="hidden" name="unitCostCents" value={decimalToCents(unitCost)} />

        <Field data-invalid={!!state.fieldErrors?.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            defaultValue={defaults?.name ?? ""}
          />
          <FieldError errors={toFieldErrors(state.fieldErrors?.name)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!state.fieldErrors?.sku}>
            <FieldLabel htmlFor="sku">SKU (optional)</FieldLabel>
            <Input
              id="sku"
              name="sku"
              maxLength={60}
              defaultValue={defaults?.sku ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.sku)} />
          </Field>
          <Field data-invalid={!!state.fieldErrors?.unit}>
            <FieldLabel htmlFor="unit">Unit</FieldLabel>
            <Input
              id="unit"
              name="unit"
              required
              maxLength={20}
              placeholder="box, pcs, ml…"
              defaultValue={defaults?.unit ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.unit)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {mode === "create" ? (
            <Field data-invalid={!!state.fieldErrors?.stockOnHand}>
              <FieldLabel htmlFor="stockOnHand">Opening stock</FieldLabel>
              <Input
                id="stockOnHand"
                name="stockOnHand"
                type="number"
                min={0}
                defaultValue={0}
                required
              />
              <FieldDescription>
                Logged as an &quot;Opening stock&quot; movement.
              </FieldDescription>
              <FieldError errors={toFieldErrors(state.fieldErrors?.stockOnHand)} />
            </Field>
          ) : (
            <Field>
              <FieldLabel>Stock on hand</FieldLabel>
              <Input value={defaults?.stockOnHand ?? 0} disabled readOnly />
              <FieldDescription>Adjust via stock movements only.</FieldDescription>
            </Field>
          )}

          <Field data-invalid={!!state.fieldErrors?.reorderPoint}>
            <FieldLabel htmlFor="reorderPoint">Reorder at</FieldLabel>
            <Input
              id="reorderPoint"
              name="reorderPoint"
              type="number"
              min={0}
              defaultValue={defaults?.reorderPoint ?? 0}
              required
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.reorderPoint)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!state.fieldErrors?.unitCostCents}>
            <FieldLabel htmlFor="unitCost">Unit cost</FieldLabel>
            <Input
              id="unitCost"
              type="text"
              inputMode="decimal"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.unitCostCents)} />
          </Field>
          <Field data-invalid={!!state.fieldErrors?.supplier}>
            <FieldLabel htmlFor="supplier">Supplier (optional)</FieldLabel>
            <Input
              id="supplier"
              name="supplier"
              maxLength={120}
              defaultValue={defaults?.supplier ?? ""}
            />
            <FieldError errors={toFieldErrors(state.fieldErrors?.supplier)} />
          </Field>
        </div>

        <Field data-invalid={!!state.fieldErrors?.notes}>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={defaults?.notes ?? ""}
          />
          <FieldError errors={toFieldErrors(state.fieldErrors?.notes)} />
        </Field>
      </FieldGroup>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" disabled={pending}>
          <Link href={mode === "edit" && itemId ? `/dashboard/inventory/${itemId}` : "/dashboard/inventory"}>
            Cancel
          </Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create item"}
        </Button>
      </div>
    </form>
  );
}
