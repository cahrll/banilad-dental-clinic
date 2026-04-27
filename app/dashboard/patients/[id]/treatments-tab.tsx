"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { DentalChart } from "@/components/app/dental-chart";
import { createTreatmentAction } from "@/lib/actions/treatments";
import { initialTreatmentFormState, toFieldErrors } from "@/lib/auth/form-state";
import {
  TOOTH_STATUS_LABELS,
  TOOTH_STATUS_VALUES,
  type ToothConditionMap,
} from "@/lib/teeth";
import { formatDate } from "./format";

export type TreatmentRow = {
  id: string;
  procedure: string;
  diagnosis: string | null;
  notes: string | null;
  performedAt: string; // ISO
  feeCents: number;
  dentistName: string;
  toothNumbers: number[];
};

export function TreatmentsTab({
  patientId,
  patientName,
  dentists,
  treatments,
  conditions,
}: {
  patientId: string;
  patientName: string;
  dentists: Array<{ id: string; name: string }>;
  treatments: TreatmentRow[];
  conditions: ToothConditionMap;
}) {
  const [open, setOpen] = useState(false);
  const totalCents = treatments.reduce((acc, t) => acc + t.feeCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {treatments.length} treatment{treatments.length === 1 ? "" : "s"} on file
          {treatments.length > 0 ? ` · total ${formatCents(totalCents)}` : ""}
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> Record treatment
        </Button>
      </div>

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No treatments recorded yet. Click <strong>Record treatment</strong> to log one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {treatments.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.procedure}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(new Date(t.performedAt))} · {t.dentistName}
                    </p>
                  </div>
                  <p className="text-sm font-medium">{formatCents(t.feeCents)}</p>
                </div>
                {t.toothNumbers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {t.toothNumbers.map((n) => (
                      <Badge key={n} variant="secondary" className="font-mono text-[10px]">
                        {n}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {t.diagnosis ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">Diagnosis: </span>
                    {t.diagnosis}
                  </p>
                ) : null}
                {t.notes ? (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecordTreatmentDialog
        patientId={patientId}
        patientName={patientName}
        dentists={dentists}
        conditions={conditions}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function RecordTreatmentDialog({
  patientId,
  patientName,
  dentists,
  conditions,
  open,
  onOpenChange,
}: {
  patientId: string;
  patientName: string;
  dentists: Array<{ id: string; name: string }>;
  conditions: ToothConditionMap;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(
    createTreatmentAction,
    initialTreatmentFormState,
  );
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected([]);
    }
  }, [state.ok, onOpenChange]);

  // Reset selection when the dialog closes so a re-open starts clean.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setSelected([]);
  }, [open]);

  function toggle(t: number) {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort((a, b) => a - b),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Record treatment for {patientName}</DialogTitle>
          <DialogDescription>
            Select affected teeth on the chart, then describe the procedure.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="patientId" value={patientId} />
          <input
            type="hidden"
            name="toothEntries"
            value={JSON.stringify(selected.map((t) => ({ toothNumber: t })))}
          />

          {state.formError ? (
            <Alert variant="destructive">
              <AlertDescription>{state.formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg border bg-muted/20 p-3">
            <DentalChart
              conditions={conditions}
              mode="select"
              selected={selected}
              onToggleSelect={toggle}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {selected.length === 0
                ? "No teeth selected (treatment can be saved without affected teeth)."
                : `Selected: ${selected.join(", ")}`}
            </p>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!state.fieldErrors?.dentistId}>
                <FieldLabel htmlFor="dentistId">Dentist</FieldLabel>
                <Select name="dentistId" defaultValue={undefined}>
                  <SelectTrigger id="dentistId" aria-invalid={!!state.fieldErrors?.dentistId}>
                    <SelectValue placeholder="Select dentist" />
                  </SelectTrigger>
                  <SelectContent>
                    {dentists.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={toFieldErrors(state.fieldErrors?.dentistId)} />
              </Field>

              <Field data-invalid={!!state.fieldErrors?.performedAt}>
                <FieldLabel htmlFor="performedAt">Performed</FieldLabel>
                <Input
                  id="performedAt"
                  name="performedAt"
                  type="date"
                  required
                  defaultValue={todayDateInput()}
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.performedAt)} />
              </Field>
            </div>

            <Field data-invalid={!!state.fieldErrors?.procedure}>
              <FieldLabel htmlFor="procedure">Procedure</FieldLabel>
              <Input
                id="procedure"
                name="procedure"
                required
                placeholder="e.g. Composite filling, Root canal therapy"
              />
              <FieldError errors={toFieldErrors(state.fieldErrors?.procedure)} />
            </Field>

            <Field>
              <FieldLabel htmlFor="diagnosis">Diagnosis (optional)</FieldLabel>
              <Input id="diagnosis" name="diagnosis" maxLength={500} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!state.fieldErrors?.feeCents}>
                <FieldLabel htmlFor="fee">Fee</FieldLabel>
                <FeeInput name="feeCents" id="fee" defaultValue={0} />
                <FieldDescription>Stored in cents.</FieldDescription>
                <FieldError errors={toFieldErrors(state.fieldErrors?.feeCents)} />
              </Field>

              <Field>
                <FieldLabel htmlFor="resultingStatus">Resulting status (optional)</FieldLabel>
                <Select name="resultingStatus" defaultValue={undefined}>
                  <SelectTrigger id="resultingStatus">
                    <SelectValue placeholder="Don't change condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOTH_STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TOOTH_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Applied to every selected tooth.
                </FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save treatment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeeInput({
  name,
  id,
  defaultValue,
}: {
  name: string;
  id: string;
  defaultValue: number;
}) {
  const [display, setDisplay] = useState(centsToDecimal(defaultValue));
  const cents = decimalToCents(display);

  return (
    <>
      <input type="hidden" name={name} value={cents} />
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        placeholder="0.00"
      />
    </>
  );
}

function todayDateInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function decimalToCents(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
