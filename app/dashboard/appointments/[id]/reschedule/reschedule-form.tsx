"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError, FieldGroup } from "@/components/ui/field";
import {
  BookingPicker,
  type BookingSelection,
} from "@/components/app/booking-picker";
import { isoDatetimeLocal } from "@/lib/datetime";
import {
  initialAppointmentFormState,
  toFieldErrors,
} from "@/lib/auth/form-state";
import { rescheduleAppointmentAction } from "@/lib/actions/appointments";

const STANDARD_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

function nearestStandardDuration(minutes: number): number {
  let best = STANDARD_DURATIONS[0] as number;
  let bestDelta = Math.abs(minutes - best);
  for (const m of STANDARD_DURATIONS) {
    const delta = Math.abs(minutes - m);
    if (delta < bestDelta) {
      best = m;
      bestDelta = delta;
    }
  }
  return best;
}

export function RescheduleAppointmentForm({
  appointmentId,
  dentistId,
  dentistName,
  startsAt,
  endsAt,
}: {
  appointmentId: string;
  dentistId: string;
  dentistName: string;
  startsAt: string;
  endsAt: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    rescheduleAppointmentAction.bind(null, appointmentId),
    initialAppointmentFormState,
  );

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const originalDurationMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
  const pickerDuration = nearestStandardDuration(originalDurationMinutes);

  const [selection, setSelection] = useState<BookingSelection | null>({
    startsAt: start,
    endsAt: new Date(start.getTime() + pickerDuration * 60000),
    dentistId,
  });
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

        <BookingPicker
          mode="staff"
          dentists={[{ id: dentistId, name: dentistName }]}
          durationMinutes={pickerDuration}
          excludeAppointmentId={appointmentId}
          initialStart={start}
          refreshKey={refreshKey}
          onChange={setSelection}
        />

        <FieldError errors={toFieldErrors(state.fieldErrors?.startsAt)} />
        <FieldError errors={toFieldErrors(state.fieldErrors?.endsAt)} />

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
      </FieldGroup>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/dashboard/appointments")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !selection}>
          {pending ? "Saving…" : "Save new time"}
        </Button>
      </div>
    </form>
  );
}
