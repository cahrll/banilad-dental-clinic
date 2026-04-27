"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DentalChart } from "@/components/app/dental-chart";
import { createTreatmentAction } from "@/lib/actions/treatments";
import { initialTreatmentFormState, toFieldErrors } from "@/lib/auth/form-state";
import {
  TOOTH_STATUS_LABELS,
  TOOTH_STATUS_VALUES,
  type ToothConditionMap,
} from "@/lib/teeth";
import { centsToDecimal, decimalToCents } from "@/lib/money";

export function RecordTreatmentForm({
  patientId,
  patientName,
  dentists,
  conditions,
}: {
  patientId: string;
  patientName: string;
  dentists: Array<{ id: string; name: string }>;
  conditions: ToothConditionMap;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createTreatmentAction,
    initialTreatmentFormState,
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [fee, setFee] = useState(centsToDecimal(0));

  function toggle(t: number) {
    setSelected((prev) =>
      prev.includes(t)
        ? prev.filter((x) => x !== t)
        : [...prev, t].sort((a, b) => a - b),
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <input
        type="hidden"
        name="toothEntries"
        value={JSON.stringify(selected.map((t) => ({ toothNumber: t })))}
      />
      <input type="hidden" name="feeCents" value={decimalToCents(fee)} />

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
            ? `No teeth selected for ${patientName} (treatment can be saved without affected teeth).`
            : `Selected: ${selected.join(", ")}`}
        </p>
      </div>

      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!state.fieldErrors?.dentistId}>
            <FieldLabel htmlFor="dentistId">Dentist</FieldLabel>
            <Select name="dentistId" defaultValue={undefined}>
              <SelectTrigger
                id="dentistId"
                aria-invalid={!!state.fieldErrors?.dentistId}
              >
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

        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={!!state.fieldErrors?.feeCents}>
            <FieldLabel htmlFor="fee">Fee</FieldLabel>
            <Input
              id="fee"
              type="text"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0.00"
            />
            <FieldDescription>Stored in cents (PHP).</FieldDescription>
            <FieldError errors={toFieldErrors(state.fieldErrors?.feeCents)} />
          </Field>

          <Field>
            <FieldLabel htmlFor="resultingStatus">
              Resulting status (optional)
            </FieldLabel>
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
            <FieldDescription>Applied to every selected tooth.</FieldDescription>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(`/dashboard/patients/${patientId}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save treatment"}
        </Button>
      </div>
    </form>
  );
}

function todayDateInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
