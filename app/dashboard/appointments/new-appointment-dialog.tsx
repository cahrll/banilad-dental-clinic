"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  BookingPicker,
  type BookingSelection,
} from "@/components/app/booking-picker";
import { isoDatetimeLocal } from "@/lib/datetime";
import { toFieldErrors, initialAppointmentFormState } from "@/lib/auth/form-state";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { PatientCombobox } from "./patient-combobox";

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

export function NewAppointmentDialog({
  open,
  onOpenChange,
  dentists,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentists: Array<{ id: string; name: string }>;
  defaultDentistId?: string;
  defaultStart?: Date;
}) {
  const [state, action, pending] = useActionState(
    createAppointmentAction,
    initialAppointmentFormState,
  );

  const [duration, setDuration] = useState<number>(30);
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  useEffect(() => {
    if (state.conflict) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(null);
      setRefreshKey((k) => k + 1);
    }
  }, [state.conflict]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Pick a day and an open time slot. Conflicts are still checked on the server.
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          <FieldGroup>
            {state.formError ? (
              <Alert variant="destructive">
                <AlertDescription>{state.formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <Field data-invalid={!!state.fieldErrors?.patientId}>
                <FieldLabel>Patient</FieldLabel>
                <PatientCombobox name="patientId" />
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

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !selection}>
              {pending ? "Booking…" : "Book appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
