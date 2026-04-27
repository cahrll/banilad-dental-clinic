"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole, requireStaff } from "@/lib/auth/guards";
import {
  TreatmentCreateSchema,
  ToothConditionSchema,
} from "@/lib/validators/treatment";
import type { ToothStatus } from "@/generated/prisma/client";
import type {
  ConditionActionState,
  TreatmentFormState,
} from "@/lib/auth/form-state";

// ----- Helpers -----

function parseToothEntriesField(formData: FormData): unknown {
  const raw = formData.get("toothEntries");
  if (typeof raw !== "string" || !raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseFeeField(formData: FormData): number | null {
  const raw = formData.get("feeCents");
  if (typeof raw !== "string") return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return n;
}

// ----- Create a treatment record -----

export async function createTreatmentAction(
  _prev: TreatmentFormState,
  formData: FormData,
): Promise<TreatmentFormState> {
  await requireStaff();

  const fee = parseFeeField(formData);
  if (fee === null) {
    return { ok: false, fieldErrors: { feeCents: ["Enter a valid amount."] } };
  }

  const toothEntriesRaw = parseToothEntriesField(formData);
  if (toothEntriesRaw === null) {
    return { ok: false, formError: "Invalid tooth selection." };
  }

  const resultingStatusRaw = formData.get("resultingStatus");
  const parsed = TreatmentCreateSchema.safeParse({
    patientId: formData.get("patientId"),
    dentistId: formData.get("dentistId"),
    appointmentId: formData.get("appointmentId") ?? undefined,
    procedure: formData.get("procedure"),
    diagnosis: formData.get("diagnosis"),
    notes: formData.get("notes"),
    performedAt: formData.get("performedAt"),
    feeCents: fee,
    toothEntries: toothEntriesRaw,
    resultingStatus:
      typeof resultingStatusRaw === "string" && resultingStatusRaw
        ? resultingStatusRaw
        : undefined,
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const data = parsed.data;

  const [patient, dentist] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, deletedAt: true },
    }),
    prisma.dentist.findUnique({ where: { id: data.dentistId }, select: { id: true } }),
  ]);
  if (!patient || patient.deletedAt) {
    return { ok: false, fieldErrors: { patientId: ["Patient not found."] } };
  }
  if (!dentist) {
    return { ok: false, fieldErrors: { dentistId: ["Dentist not found."] } };
  }

  await prisma.treatmentRecord.create({
    data: {
      patientId: data.patientId,
      dentistId: data.dentistId,
      appointmentId: data.appointmentId ?? null,
      procedure: data.procedure,
      diagnosis: data.diagnosis ?? null,
      notes: data.notes ?? null,
      performedAt: new Date(data.performedAt),
      feeCents: data.feeCents,
      toothEntries: {
        create: data.toothEntries.map((t) => ({
          toothNumber: t.toothNumber,
          surface: t.surface ?? null,
          note: t.note ?? null,
        })),
      },
    },
    select: { id: true },
  });

  // From here on, the action redirects on success — anything that needs to
  // happen before navigation must be above this line.

  // Optional: update each affected tooth's current condition.
  if (data.resultingStatus) {
    const status = data.resultingStatus as ToothStatus;
    for (const t of data.toothEntries) {
      await prisma.toothCondition.upsert({
        where: { patientId_toothNumber: { patientId: data.patientId, toothNumber: t.toothNumber } },
        create: {
          patientId: data.patientId,
          toothNumber: t.toothNumber,
          status,
          note: t.note ?? null,
        },
        update: { status, note: t.note ?? null },
      });
    }
  }

  revalidatePath(`/dashboard/patients/${data.patientId}`);
  revalidatePath("/dashboard/treatments");
  revalidatePath("/portal/treatments");
  redirect(`/dashboard/patients/${data.patientId}`);
}

// ----- Set a single tooth's current condition (without recording a treatment) -----

export async function setToothConditionAction(
  patientId: string,
  _prev: ConditionActionState,
  formData: FormData,
): Promise<ConditionActionState> {
  await requireStaff();

  const toothRaw = formData.get("toothNumber");
  const parsed = ToothConditionSchema.safeParse({
    toothNumber: typeof toothRaw === "string" ? Number.parseInt(toothRaw, 10) : Number.NaN,
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        z.flattenError(parsed.error).fieldErrors.status?.[0] ??
        z.flattenError(parsed.error).fieldErrors.toothNumber?.[0] ??
        "Invalid tooth condition.",
    };
  }

  const exists = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, deletedAt: true },
  });
  if (!exists || exists.deletedAt) return { ok: false, error: "Patient not found." };

  await prisma.toothCondition.upsert({
    where: {
      patientId_toothNumber: { patientId, toothNumber: parsed.data.toothNumber },
    },
    create: {
      patientId,
      toothNumber: parsed.data.toothNumber,
      status: parsed.data.status as ToothStatus,
      note: parsed.data.note ?? null,
    },
    update: {
      status: parsed.data.status as ToothStatus,
      note: parsed.data.note ?? null,
    },
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  return { ok: true };
}

// ----- Delete a treatment (admin) -----

export async function deleteTreatmentAction(
  treatmentId: string,
): Promise<ConditionActionState> {
  await requireRole("ADMIN");

  const t = await prisma.treatmentRecord.findUnique({
    where: { id: treatmentId },
    select: { patientId: true },
  });
  if (!t) return { ok: false, error: "Treatment not found." };

  await prisma.toothTreatmentEntry.deleteMany({ where: { treatmentId } });
  await prisma.treatmentRecord.delete({ where: { id: treatmentId } });

  revalidatePath(`/dashboard/patients/${t.patientId}`);
  revalidatePath("/dashboard/treatments");
  revalidatePath("/portal/treatments");
  return { ok: true };
}
