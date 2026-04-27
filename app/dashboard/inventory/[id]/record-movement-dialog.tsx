"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Sliders } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordStockMovementAction } from "@/lib/actions/inventory";
import { initialInventoryActionState } from "@/lib/auth/form-state";

export function RecordMovementDialog({
  itemId,
  stockOnHand,
}: {
  itemId: string;
  stockOnHand: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    recordStockMovementAction.bind(null, itemId),
    initialInventoryActionState,
  );
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ArrowDownToLine aria-hidden /> Record movement
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record stock movement</DialogTitle>
          <DialogDescription>
            Current stock: <strong>{stockOnHand}</strong>. Stock can&apos;t go below 0.
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
              <FieldLabel>Type</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                <TypeButton
                  active={type === "IN"}
                  onClick={() => setType("IN")}
                  Icon={ArrowDownToLine}
                  label="Stock in"
                />
                <TypeButton
                  active={type === "OUT"}
                  onClick={() => setType("OUT")}
                  Icon={ArrowUpFromLine}
                  label="Stock out"
                />
                <TypeButton
                  active={type === "ADJUSTMENT"}
                  onClick={() => setType("ADJUSTMENT")}
                  Icon={Sliders}
                  label="Adjust"
                />
              </div>
              <input type="hidden" name="type" value={type} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                <Input id="quantity" name="quantity" type="number" min={1} required />
              </Field>
              {type === "ADJUSTMENT" ? (
                <Field>
                  <FieldLabel htmlFor="direction">Direction</FieldLabel>
                  <Select name="direction" defaultValue="INCREASE">
                    <SelectTrigger id="direction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCREASE">Increase</SelectItem>
                      <SelectItem value="DECREASE">Decrease</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>

            <Field>
              <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
              <Input
                id="reason"
                name="reason"
                maxLength={500}
                placeholder={
                  type === "IN"
                    ? "e.g. PO #123 received"
                    : type === "OUT"
                    ? "e.g. Used in operatory 1"
                    : "e.g. Stocktake correction"
                }
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypeButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="flex flex-col items-center gap-1 rounded-md border bg-background p-3 text-xs transition-colors hover:bg-muted data-[active=true]:border-primary data-[active=true]:bg-primary/10"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}
