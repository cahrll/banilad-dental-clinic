import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHead } from "@/components/app/carbon";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { StaffForm, type StaffFormDefaults } from "../../staff-form";

export const metadata = { title: "Edit staff · Banilad Dental Clinic" };

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user: actor } = await requireRole("ADMIN");
  const { id } = await params;

  const staff = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      dentist: { select: { licenseNo: true, specialty: true, bio: true } },
      staff: { select: { position: true } },
    },
  });

  if (!staff || staff.role === "PATIENT") notFound();

  const defaults: StaffFormDefaults = {
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    role: staff.role as StaffFormDefaults["role"],
    isActive: staff.isActive,
    licenseNo: staff.dentist?.licenseNo ?? null,
    specialty: staff.dentist?.specialty ?? null,
    bio: staff.dentist?.bio ?? null,
    position: staff.staff?.position ?? null,
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href={`/dashboard/staff/${staff.id}`}>
          <ChevronLeft aria-hidden /> Back to {staff.name}
        </Link>
      </Button>

      <PageHead
        crumb="/ staff / edit"
        title={`Edit ${staff.name}`}
        description="Update profile, role, or active status."
      />

      <Card>
        <CardContent className="pt-6">
          <StaffForm
            mode="edit"
            staffUserId={staff.id}
            defaults={defaults}
            isSelf={actor.id === staff.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
