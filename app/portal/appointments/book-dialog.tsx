"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import {
  BookingPicker,
  type BookingSelection,
} from "@/components/app/booking-picker";
import { isoDatetimeLocal } from "@/lib/datetime";
import { initialAppointmentFormState, toFieldErrors } from "@/lib/auth/form-state";
import { patientBookAppointmentAction } from "@/lib/actions/appointments";

const PATIENT_DURATION_MINUTES = 30;

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

  const [dentistId, setDentistId] = useState<string | undefined>(undefined);
  const [selection, setSelection] = useState<BookingSelection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const chosenDentists = useMemo(() => {
    if (!dentistId) return [];
    const found = dentists.find((d) => d.id === dentistId);
    return found ? [{ id: found.id, name: found.name }] : [];
  }, [dentistId, dentists]);

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
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            Choose a dentist, then pick an available time. We&apos;ll confirm shortly after booking.
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
              <Select
                value={dentistId ?? ""}
                onValueChange={(v) => {
                  setDentistId(v);
                  setSelection(null);
                }}
              >
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

            {chosenDentists.length > 0 ? (
              <BookingPicker
                mode="patient"
                dentists={chosenDentists}
                durationMinutes={PATIENT_DURATION_MINUTES}
                refreshKey={refreshKey}
                onChange={setSelection}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a dentist to see available times.
              </p>
            )}

            <FieldError errors={toFieldErrors(state.fieldErrors?.startsAt)} />
            <FieldError errors={toFieldErrors(state.fieldErrors?.endsAt)} />

            <input
              type="hidden"
              name="dentistId"
              value={selection?.dentistId ?? dentistId ?? ""}
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
            <Button type="submit" disabled={pending || !selection}>
              {pending ? "Booking…" : "Book"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
