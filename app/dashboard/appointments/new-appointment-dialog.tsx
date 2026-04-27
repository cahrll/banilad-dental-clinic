"use client";

import { useActionState, useEffect, useState } from "react";
import { addMinutes, setHours, setMinutes, startOfDay } from "date-fns";
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
import { CALENDAR_DAY_START_HOUR, isoDatetimeLocal } from "@/lib/datetime";
import { toFieldErrors, initialAppointmentFormState } from "@/lib/auth/form-state";
import { createAppointmentAction } from "@/lib/actions/appointments";
import { PatientCombobox } from "./patient-combobox";

export function NewAppointmentDialog({
  open,
  onOpenChange,
  dentists,
  defaultDentistId,
  defaultStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentists: Array<{ id: string; name: string }>;
  defaultDentistId?: string;
  defaultStart: Date;
}) {
  const [state, action, pending] = useActionState(
    createAppointmentAction,
    initialAppointmentFormState,
  );

  const [start, setStart] = useState(() =>
    isoDatetimeLocal(setMinutes(setHours(startOfDay(defaultStart), CALENDAR_DAY_START_HOUR), 0)),
  );
  const [end, setEnd] = useState(() => isoDatetimeLocal(addMinutes(new Date(start), 30)));

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Conflict detection runs on the server before saving.
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          <FieldGroup>
            {state.formError ? (
              <Alert variant="destructive">
                <AlertDescription>{state.formError}</AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={!!state.fieldErrors?.patientId}>
              <FieldLabel>Patient</FieldLabel>
              <PatientCombobox name="patientId" />
              <FieldError errors={toFieldErrors(state.fieldErrors?.patientId)} />
            </Field>

            <Field data-invalid={!!state.fieldErrors?.dentistId}>
              <FieldLabel htmlFor="dentistId">Dentist</FieldLabel>
              <Select name="dentistId" defaultValue={defaultDentistId ?? undefined}>
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

            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!state.fieldErrors?.startsAt}>
                <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (e.target.value) {
                      setEnd(isoDatetimeLocal(addMinutes(new Date(e.target.value), 30)));
                    }
                  }}
                  aria-invalid={!!state.fieldErrors?.startsAt}
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.startsAt)} />
              </Field>

              <Field data-invalid={!!state.fieldErrors?.endsAt}>
                <FieldLabel htmlFor="endsAt">Ends</FieldLabel>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  aria-invalid={!!state.fieldErrors?.endsAt}
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.endsAt)} />
              </Field>
            </div>

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
            <Button type="submit" disabled={pending}>
              {pending ? "Booking…" : "Book appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
