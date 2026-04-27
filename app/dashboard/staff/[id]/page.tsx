import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/app/page-header";
import { RoleBadge } from "@/components/app/role-badge";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { ToggleActiveButton } from "./toggle-active-button";
import { DeleteStaffButton } from "./delete-staff-button";

export const metadata = { title: "Staff member · Banilad Dental Clinic" };

export default async function StaffDetailPage({
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
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      dentist: {
        select: {
          licenseNo: true,
          specialty: true,
          bio: true,
        },
      },
      staff: { select: { position: true, hireDate: true } },
    },
  });

  if (!staff || staff.role === "PATIENT") notFound();

  const isSelf = actor.id === staff.id;

  // Workload counters used by both the detail card and the delete-button copy.
  const dentistId = staff.role === "DENTIST"
    ? (await prisma.dentist.findUnique({
        where: { userId: staff.id },
        select: { id: true },
      }))?.id ?? null
    : null;

  const [
    appointmentsAsDentist,
    treatmentsAsDentist,
    appointmentsCreated,
    paymentsRecorded,
    stockMovementsLogged,
  ] = await Promise.all([
    dentistId ? prisma.appointment.count({ where: { dentistId } }) : 0,
    dentistId ? prisma.treatmentRecord.count({ where: { dentistId } }) : 0,
    prisma.appointment.count({ where: { createdById: staff.id } }),
    prisma.payment.count({ where: { recordedById: staff.id } }),
    prisma.stockMovement.count({ where: { recordedById: staff.id } }),
  ]);

  const totalWork =
    appointmentsAsDentist +
    treatmentsAsDentist +
    appointmentsCreated +
    paymentsRecorded +
    stockMovementsLogged;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/dashboard/staff">
          <ChevronLeft aria-hidden /> Back to staff
        </Link>
      </Button>

      <PageHeader
        title={staff.name}
        description={staff.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/staff/${staff.id}/edit`}>
                <Pencil aria-hidden /> Edit
              </Link>
            </Button>
            <ResetPasswordDialog staffUserId={staff.id} staffName={staff.name} />
            <ToggleActiveButton
              staffUserId={staff.id}
              isActive={staff.isActive}
              isSelf={isSelf}
            />
            <DeleteStaffButton
              staffUserId={staff.id}
              isSelf={isSelf}
              hasWork={totalWork > 0}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RoleBadge role={staff.role} />
        {staff.isActive ? (
          <Badge>Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
        {isSelf ? <Badge variant="outline">That&apos;s you</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Row label="Phone" value={staff.phone ?? "—"} />
            <Separator />
            {staff.role === "DENTIST" ? (
              <>
                <Row label="License #" value={staff.dentist?.licenseNo ?? "—"} />
                <Row label="Specialty" value={staff.dentist?.specialty ?? "—"} />
                {staff.dentist?.bio ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Bio
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {staff.dentist.bio}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <Row label="Position" value={staff.staff?.position ?? "—"} />
                {staff.staff?.hireDate ? (
                  <Row
                    label="Hire date"
                    value={formatDate(staff.staff.hireDate)}
                  />
                ) : null}
              </>
            )}
            <Separator />
            <Row label="Joined" value={formatDate(staff.createdAt)} />
            <Row label="Last updated" value={formatDate(staff.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {staff.role === "DENTIST" ? (
              <>
                <WorkRow label="Appointments" value={appointmentsAsDentist} />
                <WorkRow label="Treatments" value={treatmentsAsDentist} />
              </>
            ) : null}
            <WorkRow label="Appointments booked" value={appointmentsCreated} />
            <WorkRow label="Payments recorded" value={paymentsRecorded} />
            <WorkRow label="Stock movements" value={stockMovementsLogged} />
            {totalWork === 0 ? (
              <p className="text-xs text-muted-foreground">
                No clinic activity recorded yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function WorkRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}
