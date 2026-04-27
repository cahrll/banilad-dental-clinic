"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { requireRole } from "@/lib/auth/guards";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import {
  PasswordResetSchema,
  StaffCreateSchema,
  StaffUpdateSchema,
  generateTempPassword,
  staffFromFormData,
} from "@/lib/validators/staff";
import type {
  PasswordResetState,
  StaffActionState,
  StaffFormState,
} from "@/lib/auth/form-state";
import type { Role } from "@/generated/prisma/client";

// ----- Create -----

export async function createStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  await requireRole("ADMIN");

  const parsed = StaffCreateSchema.safeParse(staffFromFormData(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

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
      role: data.role as Role,
      name: data.name,
      phone: data.phone ?? null,
      isActive: data.isActive,
      ...(data.role === "DENTIST"
        ? {
            dentist: {
              create: {
                licenseNo: data.licenseNo!,
                specialty: data.specialty ?? null,
                bio: data.bio ?? null,
              },
            },
          }
        : {
            staff: {
              create: {
                position: data.position!,
              },
            },
          }),
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/staff");
  redirect(`/dashboard/staff/${user.id}`);
}

// ----- Update -----

export async function updateStaffAction(
  staffUserId: string,
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const { user: actor } = await requireRole("ADMIN");

  const parsed = StaffUpdateSchema.safeParse(staffFromFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      staffUserId,
    };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { id: staffUserId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      dentist: { select: { id: true } },
      staff: { select: { id: true } },
    },
  });
  if (!existing || existing.role === "PATIENT") {
    return { ok: false, formError: "Staff member not found.", staffUserId };
  }

  // Prevent the only admin (or the current admin) from demoting / deactivating themselves
  // into a state that locks them out.
  const selfEdit = actor.id === staffUserId;
  if (selfEdit) {
    if (data.role !== "ADMIN") {
      return {
        ok: false,
        fieldErrors: { role: ["You can't change your own role."] },
        staffUserId,
      };
    }
    if (!data.isActive) {
      return {
        ok: false,
        fieldErrors: { isActive: ["You can't deactivate your own account."] },
        staffUserId,
      };
    }
  }

  // Email collision check (excluding the user themselves).
  if (data.email !== existing.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: staffUserId } },
      select: { id: true },
    });
    if (conflict) {
      return {
        ok: false,
        fieldErrors: { email: ["An account with that email already exists."] },
        staffUserId,
      };
    }
  }

  // Block role transitions out of DENTIST when they have history (it would orphan
  // appointments and treatments).
  if (existing.role === "DENTIST" && data.role !== "DENTIST") {
    const dentistId = existing.dentist?.id;
    if (dentistId) {
      const [appts, treats] = await Promise.all([
        prisma.appointment.count({ where: { dentistId } }),
        prisma.treatmentRecord.count({ where: { dentistId } }),
      ]);
      if (appts + treats > 0) {
        return {
          ok: false,
          fieldErrors: {
            role: [
              `Can't change role: dentist has ${appts} appointment${appts === 1 ? "" : "s"} and ${treats} treatment${treats === 1 ? "" : "s"} on file.`,
            ],
          },
          staffUserId,
        };
      }
    }
  }

  await prisma.user.update({
    where: { id: staffUserId },
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      role: data.role as Role,
      isActive: data.isActive,
    },
  });

  // Sync the role-specific profile.
  if (data.role === "DENTIST") {
    if (existing.dentist) {
      await prisma.dentist.update({
        where: { userId: staffUserId },
        data: {
          licenseNo: data.licenseNo!,
          specialty: data.specialty ?? null,
          bio: data.bio ?? null,
        },
      });
    } else {
      await prisma.dentist.create({
        data: {
          userId: staffUserId,
          licenseNo: data.licenseNo!,
          specialty: data.specialty ?? null,
          bio: data.bio ?? null,
        },
      });
    }
    if (existing.staff) {
      await prisma.staffProfile.delete({ where: { userId: staffUserId } });
    }
  } else {
    if (existing.staff) {
      await prisma.staffProfile.update({
        where: { userId: staffUserId },
        data: { position: data.position! },
      });
    } else {
      await prisma.staffProfile.create({
        data: { userId: staffUserId, position: data.position! },
      });
    }
    if (existing.dentist) {
      // Safe to delete since we already gated this on no appointments/treatments.
      await prisma.dentist.delete({ where: { userId: staffUserId } });
    }
  }

  // Role / active changes invalidate sessions for safety.
  if (
    existing.role !== data.role ||
    (existing.isActive && !data.isActive)
  ) {
    if (!selfEdit) await revokeAllSessionsForUser(staffUserId);
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffUserId}`);
  redirect(`/dashboard/staff/${staffUserId}`);
}

// ----- Reset password (admin-issued temp password) -----

export async function resetPasswordAction(
  staffUserId: string,
  _prev: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  await requireRole("ADMIN");

  const customRaw = formData.get("password");
  const useCustom = typeof customRaw === "string" && customRaw.trim().length > 0;

  let nextPassword: string;
  if (useCustom) {
    const parsed = PasswordResetSchema.safeParse({ password: customRaw });
    if (!parsed.success) {
      return {
        ok: false,
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }
    nextPassword = parsed.data.password;
  } else {
    nextPassword = generateTempPassword();
  }

  const target = await prisma.user.findUnique({
    where: { id: staffUserId },
    select: { id: true, role: true },
  });
  if (!target || target.role === "PATIENT") {
    return { ok: false, error: "Staff member not found." };
  }

  const passwordHash = await hashPassword(nextPassword);

  await prisma.user.update({
    where: { id: staffUserId },
    data: { passwordHash },
  });

  // Force re-login on every device.
  await revokeAllSessionsForUser(staffUserId);

  revalidatePath(`/dashboard/staff/${staffUserId}`);
  return { ok: true, tempPassword: nextPassword };
}

// ----- Activate / deactivate -----

export async function setStaffActiveAction(
  staffUserId: string,
  isActive: boolean,
): Promise<StaffActionState> {
  const { user: actor } = await requireRole("ADMIN");

  if (actor.id === staffUserId && !isActive) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: staffUserId },
    select: { id: true, role: true },
  });
  if (!target || target.role === "PATIENT") {
    return { ok: false, error: "Staff member not found." };
  }

  await prisma.user.update({
    where: { id: staffUserId },
    data: { isActive },
  });

  // Deactivating must terminate any open sessions.
  if (!isActive) await revokeAllSessionsForUser(staffUserId);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffUserId}`);
  return { ok: true };
}

// ----- Hard delete (admin-only, blocked when dependents exist) -----

export async function deleteStaffAction(
  staffUserId: string,
): Promise<StaffActionState> {
  const { user: actor } = await requireRole("ADMIN");

  if (actor.id === staffUserId) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: staffUserId },
    select: {
      id: true,
      role: true,
      dentist: { select: { id: true } },
      staff: { select: { id: true } },
    },
  });
  if (!target || target.role === "PATIENT") {
    return { ok: false, error: "Staff member not found." };
  }

  const dentistId = target.dentist?.id;
  const [
    appointmentsAsDentist,
    treatmentsAsDentist,
    appointmentsCreated,
    paymentsRecorded,
    stockMovementsLogged,
    documentsUploaded,
  ] = await Promise.all([
    dentistId ? prisma.appointment.count({ where: { dentistId } }) : 0,
    dentistId ? prisma.treatmentRecord.count({ where: { dentistId } }) : 0,
    prisma.appointment.count({ where: { createdById: staffUserId } }),
    prisma.payment.count({ where: { recordedById: staffUserId } }),
    prisma.stockMovement.count({ where: { recordedById: staffUserId } }),
    prisma.document.count({ where: { uploadedById: staffUserId } }),
  ]);

  const total =
    appointmentsAsDentist +
    treatmentsAsDentist +
    appointmentsCreated +
    paymentsRecorded +
    stockMovementsLogged +
    documentsUploaded;

  if (total > 0) {
    return {
      ok: false,
      error: `This account has ${describeWork({
        appointmentsAsDentist,
        treatmentsAsDentist,
        appointmentsCreated,
        paymentsRecorded,
        stockMovementsLogged,
        documentsUploaded,
      })}. Deactivate instead of deleting.`,
    };
  }

  await prisma.session.deleteMany({ where: { userId: staffUserId } });
  if (target.dentist) {
    await prisma.dentist.delete({ where: { userId: staffUserId } });
  }
  if (target.staff) {
    await prisma.staffProfile.delete({ where: { userId: staffUserId } });
  }
  await prisma.user.delete({ where: { id: staffUserId } });

  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}

function describeWork(c: {
  appointmentsAsDentist: number;
  treatmentsAsDentist: number;
  appointmentsCreated: number;
  paymentsRecorded: number;
  stockMovementsLogged: number;
  documentsUploaded: number;
}): string {
  const parts: string[] = [];
  if (c.appointmentsAsDentist) parts.push(`${c.appointmentsAsDentist} dentist appointment${plural(c.appointmentsAsDentist)}`);
  if (c.treatmentsAsDentist) parts.push(`${c.treatmentsAsDentist} treatment${plural(c.treatmentsAsDentist)}`);
  if (c.appointmentsCreated) parts.push(`${c.appointmentsCreated} appointment${plural(c.appointmentsCreated)} created`);
  if (c.paymentsRecorded) parts.push(`${c.paymentsRecorded} payment${plural(c.paymentsRecorded)} recorded`);
  if (c.stockMovementsLogged) parts.push(`${c.stockMovementsLogged} stock movement${plural(c.stockMovementsLogged)}`);
  if (c.documentsUploaded) parts.push(`${c.documentsUploaded} document upload${plural(c.documentsUploaded)}`);
  return parts.join(", ");
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}
