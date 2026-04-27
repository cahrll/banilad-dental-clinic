import type { Role } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";

const labels: Record<Role, string> = {
  ADMIN: "Admin",
  DENTIST: "Dentist",
  RECEPTIONIST: "Receptionist",
  PATIENT: "Patient",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant="secondary">{labels[role]}</Badge>;
}
