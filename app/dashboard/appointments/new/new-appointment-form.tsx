"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  BookingPicker,
  type BookingSelection,
} from "@/components/app/booking-picker";
import { isoDatetimeLocal } from "@/lib/datetime";
import {
  initialAppointmentFormState,
  toFieldErrors,
} from "@/lib/auth/form-state";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { PatientCombobox } from "../patient-combobox";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export function NewAppointmentForm({
  dentists,
  initialPatient,
}: {
  dentists: Array<{ id: string; name: string }>;
  initialPatient: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createAppointmentAction,
    initialAppointmentFormState,
  );

  const [duration, setDuration] = useState<number>(30);
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (state.conflict) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(null);
      setRefreshKey((k) => k + 1);
    }
  }, [state.conflict]);

  return (
    <form action={action} className="space-y-4">
      <FieldGroup>
        {state.formError ? (
          <Alert variant="destructive">
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Field data-invalid={!!state.fieldErrors?.patientId}>
            <FieldLabel>Patient</FieldLabel>
            {initialPatient ? (
              <>
                <input type="hidden" name="patientId" value={initialPatient.id} />
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <span>{initialPatient.name}</span>
                </div>
              </>
            ) : (
              <PatientCombobox name="patientId" />
            )}
            <FieldError errors={toFieldErrors(state.fieldErrors?.patientId)} />
          </Field>

          <Field>
            <FieldLabel htmlFor="duration">Duration</FieldLabel>
            <Select
              value={String(duration)}
              onValueChange={(v) => {
                setDuration(Number(v));
                setSelection(null);
              }}
            >
              <SelectTrigger id="duration" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <BookingPicker
          mode="staff"
          dentists={dentists}
          durationMinutes={duration}
          refreshKey={refreshKey}
          onChange={setSelection}
        />

        <FieldError errors={toFieldErrors(state.fieldErrors?.dentistId)} />
        <FieldError errors={toFieldErrors(state.fieldErrors?.startsAt)} />
        <FieldError errors={toFieldErrors(state.fieldErrors?.endsAt)} />

        <input
          type="hidden"
          name="dentistId"
          value={selection?.dentistId ?? ""}
        />
        <input
          type="hidden"
          name="startsAt"
          value={selection ? isoDatetimeLocal(selection.startsAt) : ""}
        />
        <input
          type="hidden"
          name="endsAt"
          value={selection ? isoDatetimeLocal(selection.endsAt) : ""}
        />

        <Field>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <Input id="reason" name="reason" placeholder="Cleaning, consult, …" />
        </Field>

        <Field>
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            router.push(
              initialPatient
                ? `/dashboard/patients/${initialPatient.id}`
                : "/dashboard/appointments",
            )
          }
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !selection}>
          {pending ? "Booking…" : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
