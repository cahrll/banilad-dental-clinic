import { z } from "zod";

const APPOINTMENT_MAX_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const APPOINTMENT_MIN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const datetimeLocal = z
  .string()
  .min(1, "Required.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time.");

const objectId = z.string().min(1, "Required.").regex(/^[0-9a-fA-F]{24}$/, "Invalid id.");

// Base object — kept un-refined so `.pick()`/`.omit()` still work.
const AppointmentCreateObject = z.object({
  patientId: objectId,
  dentistId: objectId,
  startsAt: datetimeLocal,
  endsAt: datetimeLocal,
  reason: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
});

const TimeRangeObject = AppointmentCreateObject.pick({ startsAt: true, endsAt: true });

function withDurationChecks<T extends z.ZodObject<{ startsAt: z.ZodTypeAny; endsAt: z.ZodTypeAny }>>(
  schema: T,
) {
  return schema
    .refine((d) => Date.parse(d.endsAt as string) > Date.parse(d.startsAt as string), {
      path: ["endsAt"],
      message: "End time must be after start time.",
    })
    .refine(
      (d) =>
        Date.parse(d.endsAt as string) - Date.parse(d.startsAt as string) <= APPOINTMENT_MAX_DURATION_MS,
      { path: ["endsAt"], message: "Appointment can be at most 8 hours." },
    )
    .refine(
      (d) =>
        Date.parse(d.endsAt as string) - Date.parse(d.startsAt as string) >= APPOINTMENT_MIN_DURATION_MS,
      { path: ["endsAt"], message: "Appointment must be at least 5 minutes." },
    );
}

export const AppointmentCreateSchema = withDurationChecks(AppointmentCreateObject);
export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentRescheduleSchema = withDurationChecks(TimeRangeObject);

export const AppointmentStatusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

// Patients omit patientId — derived from session.
export const PatientBookingSchema = withDurationChecks(
  AppointmentCreateObject.omit({ patientId: true }),
);

export function appointmentFromFormData(formData: FormData): Record<string, unknown> {
  const get = (n: string) => {
    const v = formData.get(n);
    return typeof v === "string" ? v : undefined;
  };
  return {
    patientId: get("patientId"),
    dentistId: get("dentistId"),
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    reason: get("reason"),
    notes: get("notes"),
  };
}
