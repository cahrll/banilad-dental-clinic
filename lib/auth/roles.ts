import type { Role } from "@prisma/client";

// Edge-safe: pure constants/types only. No Prisma client, no Node-only APIs.
// Importable from proxy.ts and lib/auth/guards.ts.

export const STAFF_ROLES = ["ADMIN", "DENTIST", "RECEPTIONIST"] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly Role[]).includes(role);
}

export function homePathForRole(role: Role): string {
  return role === "PATIENT" ? "/portal" : "/dashboard";
}
