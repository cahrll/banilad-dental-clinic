"use client";

import { useActionState, useEffect, useState } from "react";
import { addDays, addMinutes, setHours, setMinutes, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { isoDatetimeLocal } from "@/lib/datetime";
import { initialAppointmentFormState, toFieldErrors } from "@/lib/auth/form-state";
import { patientBookAppointmentAction } from "@/lib/actions/appointments";

export function PatientBookDialog({
  open,
  onOpenChange,
  dentists,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentists: Array<{ id: string; name: string; specialty: string | null }>;
}) {
  const [state, action, pending] = useActionState(
    patientBookAppointmentAction,
    initialAppointmentFormState,
  );

  const [start, setStart] = useState(() =>
    isoDatetimeLocal(setMinutes(setHours(startOfDay(addDays(new Date(), 1)), 9), 0)),
  );
  const [end, setEnd] = useState(() => isoDatetimeLocal(addMinutes(new Date(start), 30)));

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            Choose a dentist and time. We&apos;ll confirm shortly after booking.
          </DialogDescription>
        </DialogHeader>

        <form action={action}>
          <FieldGroup>
            {state.formError ? (
              <Alert variant="destructive">
                <AlertDescription>{state.formError}</AlertDescription>
              </Alert>
            ) : null}

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
                      {d.specialty ? ` · ${d.specialty}` : ""}
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
                />
                <FieldError errors={toFieldErrors(state.fieldErrors?.endsAt)} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="reason">Reason (optional)</FieldLabel>
              <Input id="reason" name="reason" placeholder="e.g. Cleaning, toothache" />
              <FieldDescription>
                Helps the dentist prepare for your visit.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Anything else? (optional)</FieldLabel>
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
              {pending ? "Booking…" : "Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
