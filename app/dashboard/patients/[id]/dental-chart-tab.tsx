"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { DentalChart } from "@/components/app/dental-chart";
import {
  TOOTH_STATUS_LABELS,
  TOOTH_STATUS_VALUES,
  type ToothConditionMap,
} from "@/lib/teeth";
import { setToothConditionAction } from "@/lib/actions/treatments";
import { initialConditionActionState } from "@/lib/auth/form-state";
import type { ToothStatus } from "@prisma/client";

export function DentalChartTab({
  patientId,
  conditions,
  conditionNotes,
}: {
  patientId: string;
  conditions: ToothConditionMap;
  conditionNotes: Record<number, string | null>;
}) {
  const [openTooth, setOpenTooth] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dental chart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DentalChart
          conditions={conditions}
          mode="view"
          onToothClick={(t) => setOpenTooth(t)}
        />
        <p className="text-xs text-muted-foreground">
          Click any tooth to record or update its current condition. Recording a
          treatment from the Treatments tab can also update conditions in bulk.
        </p>
      </CardContent>

      {openTooth !== null ? (
        <ToothEditorDialog
          patientId={patientId}
          tooth={openTooth}
          currentStatus={conditions[openTooth]}
          currentNote={conditionNotes[openTooth] ?? null}
          open={openTooth !== null}
          onOpenChange={(open) => !open && setOpenTooth(null)}
        />
      ) : null}
    </Card>
  );
}

function ToothEditorDialog({
  patientId,
  tooth,
  currentStatus,
  currentNote,
  open,
  onOpenChange,
}: {
  patientId: string;
  tooth: number;
  currentStatus?: ToothStatus;
  currentNote: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    setToothConditionAction.bind(null, patientId),
    initialConditionActionState,
  );

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tooth {tooth}</DialogTitle>
          <DialogDescription>
            Current status:{" "}
            {currentStatus ? TOOTH_STATUS_LABELS[currentStatus] : "Not recorded"}
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          <FieldGroup>
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <input type="hidden" name="toothNumber" value={tooth} />

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select name="status" defaultValue={currentStatus ?? undefined}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {TOOTH_STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TOOTH_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
              <Input
                id="note"
                name="note"
                defaultValue={currentNote ?? ""}
                placeholder="e.g. Mesial occlusal"
                maxLength={500}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save condition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
