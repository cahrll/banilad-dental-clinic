import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KpiGrid,
  KpiCell,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { RoleBadge } from "@/components/app/role-badge";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
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
  const dentistId =
    staff.role === "DENTIST"
      ? (
          await prisma.dentist.findUnique({
            where: { userId: staff.id },
            select: { id: true },
          })
        )?.id ?? null
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
    <div className="flex flex-col gap-10">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit font-mono text-[11px] uppercase tracking-wider"
      >
        <Link href="/dashboard/staff">
          <ChevronLeft aria-hidden /> Back to staff
        </Link>
      </Button>

      <PageHead
        crumb={`/ staff / ${slug(staff.name)}`}
        title={staff.name}
        description={staff.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
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

      {/* Chip strip */}
      <div
        data-tabular
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <RoleBadge role={staff.role} />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            staff.isActive ? "text-success" : "text-muted-foreground",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block size-1.5 rounded-full",
              staff.isActive ? "bg-success" : "bg-muted-foreground",
            )}
          />
          {staff.isActive ? "Active" : "Inactive"}
        </span>
        {isSelf ? <span>· that&apos;s you</span> : null}
      </div>

      {/* Workload KPI block */}
      <KpiGrid
        columns={staff.role === "DENTIST" ? 4 : 3}
      >
        {staff.role === "DENTIST" ? (
          <>
            <KpiCell
              label="Appointments"
              value={String(appointmentsAsDentist)}
              meta="as dentist"
            />
            <KpiCell
              label="Treatments"
              value={String(treatmentsAsDentist)}
              meta="logged"
            />
          </>
        ) : null}
        <KpiCell
          label="Appointments booked"
          value={String(appointmentsCreated)}
          meta="created by"
        />
        <KpiCell
          label="Payments recorded"
          value={String(paymentsRecorded)}
        />
        <KpiCell
          label="Stock movements"
          value={String(stockMovementsLogged)}
        />
      </KpiGrid>

      {/* §01 Profile */}
      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 01 / profile" title="Profile" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Phone" value={staff.phone ?? "—"} />
          {staff.role === "DENTIST" ? (
            <>
              <DetailRow
                label="License #"
                value={staff.dentist?.licenseNo ?? "—"}
              />
              <DetailRow
                label="Specialty"
                value={staff.dentist?.specialty ?? "—"}
              />
            </>
          ) : (
            <>
              <DetailRow
                label="Position"
                value={staff.staff?.position ?? "—"}
              />
              <DetailRow
                label="Hire date"
                value={
                  staff.staff?.hireDate ? formatDate(staff.staff.hireDate) : "—"
                }
              />
            </>
          )}
          <DetailRow label="Joined" value={formatDate(staff.createdAt)} />
          <DetailRow label="Last updated" value={formatDate(staff.updatedAt)} />
        </div>
        {staff.role === "DENTIST" && staff.dentist?.bio ? (
          <div className="border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Bio
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {staff.dentist.bio}
            </p>
          </div>
        ) : null}
      </section>

      <Plate
        left={`Staff · ${staff.name}`}
        right={`${totalWork} contribution${totalWork === 1 ? "" : "s"} on record`}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value}</p>
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

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
