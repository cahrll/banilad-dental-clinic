"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { requireRole, requireStaff } from "@/lib/auth/guards";
import {
  PatientCreateSchema,
  PatientUpdateSchema,
  patientFromFormData,
} from "@/lib/validators/patient";
import type { PatientFormState, DeleteState } from "@/lib/auth/form-state";

// ----- Create -----

export async function createPatientAction(
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  await requireStaff();

  const raw = patientFromFormData(formData);
  const parsed = PatientCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const wantsAccount = !!(data.email && data.password);

  if (data.email && !data.password) {
    return {
      ok: false,
      fieldErrors: { password: ["Password is required when an email is set."] },
    };
  }
  if (!data.email && data.password) {
    return {
      ok: false,
      fieldErrors: { email: ["Email is required when a password is set."] },
    };
  }

  let userId: string;
  if (wantsAccount && data.email && data.password) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        fieldErrors: { email: ["An account with that email already exists."] },
      };
    }
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "PATIENT",
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone ?? null,
      },
      select: { id: true },
    });
    userId = user.id;
  } else {
    // Patient without portal login. Synthesize a placeholder user with an
    // un-loginable password and isActive=false. They can be linked to a real
    // account later if needed.
    const placeholderHash = await hashPassword(crypto.randomUUID() + crypto.randomUUID());
    const placeholder = await prisma.user.create({
      data: {
        email: `noportal-${crypto.randomUUID()}@banilad.local`,
        passwordHash: placeholderHash,
        role: "PATIENT",
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone ?? null,
        isActive: false,
      },
      select: { id: true },
    });
    userId = placeholder.id;
  }

  const patient = await prisma.patient.create({
    data: {
      userId,
      firstName: data.firstName,
      lastName: data.lastName,
      sex: data.sex,
      dateOfBirth: new Date(data.dateOfBirth),
      phone: data.phone ?? null,
      address: data.address ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      medicalHistory: data.medicalHistory ?? null,
      allergies: data.allergies ?? null,
      insuranceProvider: data.insuranceProvider ?? null,
      insurancePolicyNo: data.insurancePolicyNo ?? null,
      notes: data.notes ?? null,
      // Explicit null so MongoDB stores the field; missing fields are unreliable
      // to filter on with `where: { deletedAt: null }`.
      deletedAt: null,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/patients");
  redirect(`/dashboard/patients/${patient.id}`);
}

// ----- Update -----
// Bound with `.bind(null, patientId)` so the form receives (prev, formData).

export async function updatePatientAction(
  patientId: string,
  _prev: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  await requireStaff();

  const raw = patientFromFormData(formData);
  const parsed = PatientUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      patientId,
    };
  }

  const data = parsed.data;

  const existing = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    return { ok: false, formError: "Patient not found.", patientId };
  }

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      sex: data.sex,
      dateOfBirth: new Date(data.dateOfBirth),
      phone: data.phone ?? null,
      address: data.address ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      medicalHistory: data.medicalHistory ?? null,
      allergies: data.allergies ?? null,
      insuranceProvider: data.insuranceProvider ?? null,
      insurancePolicyNo: data.insurancePolicyNo ?? null,
      notes: data.notes ?? null,
    },
  });

  await prisma.user.update({
    where: { id: existing.userId },
    data: {
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone: data.phone ?? null,
    },
  });

  revalidatePath(`/dashboard/patients/${patientId}`);
  revalidatePath("/dashboard/patients");
  redirect(`/dashboard/patients/${patientId}`);
}

// ----- Soft delete (archive) and restore -----

export async function archivePatientAction(
  patientId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: DeleteState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<DeleteState> {
  await requireStaff();

  const existing = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, deletedAt: true },
  });
  if (!existing) return { ok: false, error: "Patient not found." };

  if (!existing.deletedAt) {
    await prisma.patient.update({
      where: { id: patientId },
      data: { deletedAt: new Date() },
    });
  }

  revalidatePath("/dashboard/patients");
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { ok: true };
}

export async function restorePatientAction(
  patientId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: DeleteState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<DeleteState> {
  await requireStaff();

  await prisma.patient.update({
    where: { id: patientId },
    data: { deletedAt: null },
  });

  revalidatePath("/dashboard/patients");
  revalidatePath(`/dashboard/patients/${patientId}`);
  return { ok: true };
}

// ----- Hard delete (admin-only, blocked when dependents exist) -----

export async function hardDeletePatientAction(
  patientId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: DeleteState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<DeleteState> {
  await requireRole("ADMIN");

  const [appointments, treatments, invoices, documents] = await Promise.all([
    prisma.appointment.count({ where: { patientId } }),
    prisma.treatmentRecord.count({ where: { patientId } }),
    prisma.invoice.count({ where: { patientId } }),
    prisma.document.count({ where: { patientId } }),
  ]);

  const total = appointments + treatments + invoices + documents;
  if (total > 0) {
    return {
      ok: false,
      error: `This patient has ${describeCounts({ appointments, treatments, invoices, documents })}. Archive them instead of deleting.`,
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  await prisma.toothCondition.deleteMany({ where: { patientId } });
  await prisma.patient.delete({ where: { id: patientId } });
  await prisma.session.deleteMany({ where: { userId: patient.userId } });
  await prisma.user.delete({ where: { id: patient.userId } });

  revalidatePath("/dashboard/patients");
  redirect("/dashboard/patients");
}

function describeCounts(c: {
  appointments: number;
  treatments: number;
  invoices: number;
  documents: number;
}): string {
  const parts: string[] = [];
  if (c.appointments) parts.push(`${c.appointments} appointment${c.appointments === 1 ? "" : "s"}`);
  if (c.treatments) parts.push(`${c.treatments} treatment${c.treatments === 1 ? "" : "s"}`);
  if (c.invoices) parts.push(`${c.invoices} invoice${c.invoices === 1 ? "" : "s"}`);
  if (c.documents) parts.push(`${c.documents} document${c.documents === 1 ? "" : "s"}`);
  return parts.join(", ");
}
