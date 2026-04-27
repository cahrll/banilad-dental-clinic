"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, deleteExpiredSessionsForUser, revokeSession } from "./session";
import { setSessionCookie, clearSessionCookie, readSessionCookie } from "./cookies";
import { hashToken } from "./tokens";
import { homePathForRole } from "./roles";
import type { FormState } from "./form-state";

// Generic message for any login failure mode (no email enumeration).
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

// ----- Login -----

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { email, password, next } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return { ok: false, formError: GENERIC_LOGIN_ERROR };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { ok: false, formError: GENERIC_LOGIN_ERROR };
  }

  // Reap any expired sessions for this user opportunistically.
  await deleteExpiredSessionsForUser(user.id);

  const hdrs = await headers();
  const session = await createSession(user.id, {
    userAgent: hdrs.get("user-agent"),
    ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  await setSessionCookie(session.rawToken, session.expiresAt);

  redirect((await safeNext(next)) ?? homePathForRole(user.role));
}

// ----- Register (patient self-signup only) -----

const RegisterSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(200)
      .regex(/[a-zA-Z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number."),
    confirmPassword: z.string(),
    firstName: z.string().trim().min(1, "First name is required.").max(80),
    lastName: z.string().trim().min(1, "Last name is required.").max(80),
    sex: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required.")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function registerPatientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    sex: formData.get("sex"),
    dateOfBirth: formData.get("dateOfBirth"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, formError: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: "PATIENT",
      name: data.name,
      phone: data.phone ? data.phone : null,
      patient: {
        create: {
          firstName: data.firstName,
          lastName: data.lastName,
          sex: data.sex,
          dateOfBirth: new Date(data.dateOfBirth),
          phone: data.phone ? data.phone : null,
          deletedAt: null,
        },
      },
    },
    select: { id: true, role: true },
  });

  const hdrs = await headers();
  const session = await createSession(user.id, {
    userAgent: hdrs.get("user-agent"),
    ip: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  await setSessionCookie(session.rawToken, session.expiresAt);

  redirect(homePathForRole(user.role));
}

// ----- Logout -----

export async function logoutAction(): Promise<void> {
  const raw = await readSessionCookie();
  if (raw) {
    await revokeSession(hashToken(raw));
  }
  await clearSessionCookie();
  redirect("/login");
}

// ----- Helpers -----

// Only allow same-site relative paths for `?next=` to prevent open redirects.
// Helper is async to satisfy the "use server" file constraint that all exports be async functions.
async function safeNext(next: string | undefined): Promise<string | null> {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}
