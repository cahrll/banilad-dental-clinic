"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireStaff, requirePatient } from "@/lib/auth/guards";
import { dentistHasConflict } from "@/lib/availability";
import {
  AppointmentCreateSchema,
  AppointmentRescheduleSchema,
  AppointmentStatusSchema,
  PatientBookingSchema,
  appointmentFromFormData,
} from "@/lib/validators/appointment";
import type {
  AppointmentFormState,
  StatusActionState,
} from "@/lib/auth/form-state";
import type { AppointmentStatus } from "@/generated/prisma/client";

// ----- Staff: create appointment -----

export async function createAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const { user } = await requireStaff();

  const raw = appointmentFromFormData(formData);
  const parsed = AppointmentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const data = parsed.data;
  const start = new Date(data.startsAt);
  const end = new Date(data.endsAt);

  const [patient, dentist] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, deletedAt: true },
    }),
    prisma.dentist.findUnique({
      where: { id: data.dentistId },
      select: { id: true },
    }),
  ]);
  if (!patient || patient.deletedAt) {
    return { ok: false, fieldErrors: { patientId: ["Patient not found."] } };
  }
  if (!dentist) {
    return { ok: false, fieldErrors: { dentistId: ["Dentist not found."] } };
  }

  if (await dentistHasConflict({ dentistId: data.dentistId, start, end })) {
    return {
      ok: false,
      conflict: true,
      formError: "That dentist already has another appointment overlapping this time.",
    };
  }

  await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      dentistId: data.dentistId,
      startsAt: start,
      endsAt: end,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      status: "SCHEDULED",
      createdById: user.id,
    },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/patients/${data.patientId}`);
  return { ok: true };
}

// ----- Staff: reschedule -----

export async function rescheduleAppointmentAction(
  appointmentId: string,
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  await requireStaff();

  const parsed = AppointmentRescheduleSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, appointmentId };
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, dentistId: true, patientId: true, status: true },
  });
  if (!existing) return { ok: false, formError: "Appointment not found.", appointmentId };
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    return {
      ok: false,
      formError: "Completed or cancelled appointments can't be rescheduled.",
      appointmentId,
    };
  }

  const start = new Date(parsed.data.startsAt);
  const end = new Date(parsed.data.endsAt);

  if (
    await dentistHasConflict({
      dentistId: existing.dentistId,
      start,
      end,
      excludeAppointmentId: appointmentId,
    })
  ) {
    return {
      ok: false,
      conflict: true,
      formError: "That time conflicts with another appointment for this dentist.",
      appointmentId,
    };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { startsAt: start, endsAt: end },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/patients/${existing.patientId}`);
  revalidatePath("/portal/appointments");
  return { ok: true, appointmentId };
}

// ----- Staff: status change -----

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<StatusActionState> {
  await requireStaff();

  const parsed = AppointmentStatusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true, patientId: true },
  });
  if (!existing) return { ok: false, error: "Appointment not found." };

  if (!isValidStatusTransition(existing.status, parsed.data.status)) {
    return {
      ok: false,
      error: `Can't move from ${existing.status} to ${parsed.data.status}.`,
    };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: parsed.data.status },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/patients/${existing.patientId}`);
  revalidatePath("/portal/appointments");
  return { ok: true };
}

function isValidStatusTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return true;
  const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
    SCHEDULED: ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
    CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
    COMPLETED: [],
    CANCELLED: ["SCHEDULED"],
    NO_SHOW: ["SCHEDULED"],
  };
  return allowed[from].includes(to);
}

// ----- Patient self-booking (PATIENT role) -----

export async function patientBookAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });
  if (!patient || patient.deletedAt) {
    return { ok: false, formError: "No patient record linked to your account." };
  }

  const parsed = PatientBookingSchema.safeParse({
    dentistId: formData.get("dentistId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;
  const start = new Date(data.startsAt);
  const end = new Date(data.endsAt);

  // Patients must book at least 2 hours ahead. The picker dims slots inside this window;
  // this server-side check is the authoritative gate.
  if (start.getTime() < Date.now() + 2 * 60 * 60 * 1000) {
    return {
      ok: false,
      fieldErrors: { startsAt: ["Pick a time at least 2 hours from now."] },
    };
  }

  if (await dentistHasConflict({ dentistId: data.dentistId, start, end })) {
    return {
      ok: false,
      conflict: true,
      formError: "That slot is no longer available. Pick a different time.",
    };
  }

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      dentistId: data.dentistId,
      startsAt: start,
      endsAt: end,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      status: "SCHEDULED",
      createdById: user.id,
    },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/dashboard/appointments");
  return { ok: true };
}

export async function patientCancelAppointmentAction(
  appointmentId: string,
): Promise<StatusActionState> {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) return { ok: false, error: "No patient record." };

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, patientId: true, status: true },
  });
  if (!existing || existing.patientId !== patient.id) {
    return { ok: false, error: "Appointment not found." };
  }
  if (existing.status !== "SCHEDULED" && existing.status !== "CONFIRMED") {
    return { ok: false, error: "Only upcoming appointments can be cancelled." };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/portal/appointments");
  revalidatePath("/dashboard/appointments");
  return { ok: true };
}

// ----- Hard delete (admin) — only for accidental entries with no clinical history. -----

export async function deleteAppointmentAction(
  appointmentId: string,
): Promise<StatusActionState> {
  await requireRole("ADMIN");

  const t = await prisma.treatmentRecord.count({ where: { appointmentId } });
  if (t > 0) {
    return {
      ok: false,
      error: `Can't delete: ${t} treatment record${t === 1 ? "" : "s"} reference this appointment.`,
    };
  }

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true },
  });
  if (!existing) return { ok: false, error: "Not found." };

  await prisma.appointment.delete({ where: { id: appointmentId } });
  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/patients/${existing.patientId}`);
  return { ok: true };
}
