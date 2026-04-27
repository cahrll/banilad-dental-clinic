import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getCurrentUser, type CurrentSession, type CurrentUser } from "./current-user";
import { STAFF_ROLES } from "./roles";

export async function requireUser(redirectTo?: string): Promise<CurrentSession> {
  const session = await getCurrentUser();
  if (!session) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/login${next}`);
  }
  return session;
}

export async function requireRole(
  role: Role | readonly Role[],
  redirectTo?: string,
): Promise<CurrentSession> {
  const session = await requireUser(redirectTo);
  const allowed = Array.isArray(role) ? (role as readonly Role[]) : [role as Role];
  if (!allowed.includes(session.user.role)) {
    redirect("/forbidden");
  }
  return session;
}

export async function requireStaff(redirectTo?: string): Promise<CurrentSession> {
  return requireRole(STAFF_ROLES, redirectTo);
}

export async function requirePatient(redirectTo?: string): Promise<CurrentSession> {
  return requireRole("PATIENT", redirectTo);
}

export function hasRole(user: CurrentUser, role: Role | readonly Role[]): boolean {
  const allowed = Array.isArray(role) ? (role as readonly Role[]) : [role as Role];
  return allowed.includes(user.role);
}
