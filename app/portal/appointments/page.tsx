import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerNum,
  LedgerName,
  LedgerMeta,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";
import { CancelButton } from "./cancel-button";

export const metadata = { title: "My appointments · Banilad Dental Clinic" };

const UPCOMING_COLS = "170px minmax(0,1.3fr) minmax(0,1fr) 90px 100px";
const PAST_COLS = "170px minmax(0,1.3fr) minmax(0,1fr) 100px";

export default async function PatientAppointmentsPage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead crumb="/ appointments" title="My appointments" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Your patient record isn&apos;t set up yet. Please contact the clinic.
        </p>
      </div>
    );
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    orderBy: { startsAt: "desc" },
    take: 50,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      reason: true,
      dentist: { select: { user: { select: { name: true } } } },
    },
  });

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.endsAt >= now && a.status !== "CANCELLED",
  );
  const past = appointments.filter(
    (a) => !(a.endsAt >= now && a.status !== "CANCELLED"),
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        crumb="/ appointments"
        title="My appointments"
        description="Book a slot, view upcoming visits, or cancel."
        actions={
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/portal/appointments/new">
              <Plus aria-hidden /> Book
            </Link>
          </Button>
        }
      />

      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 01 / upcoming"
          title="Upcoming"
        />
        {upcoming.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No upcoming appointments yet.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={UPCOMING_COLS}
              labels={[
                "When",
                "Dentist",
                "Reason",
                { label: "Status", align: "right" },
                { label: "", align: "right" },
              ]}
            />
            {upcoming.map((a) => (
              <LedgerRow key={a.id} cols={UPCOMING_COLS}>
                <LedgerNum>{formatDateTime(a.startsAt)}</LedgerNum>
                <LedgerName>{a.dentist.user.name}</LedgerName>
                <LedgerMeta>{a.reason ?? "—"}</LedgerMeta>
                <AppointmentStatusInk status={a.status} />
                <span className="flex justify-end">
                  {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
                    <CancelButton appointmentId={a.id} />
                  ) : null}
                </span>
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 02 / past" title="Past" />
        {past.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            No past appointments yet.
          </p>
        ) : (
          <Ledger>
            <LedgerHead
              cols={PAST_COLS}
              labels={[
                "When",
                "Dentist",
                "Reason",
                { label: "Status", align: "right" },
              ]}
            />
            {past.map((a) => (
              <LedgerRow key={a.id} cols={PAST_COLS}>
                <LedgerNum>{formatDateTime(a.startsAt)}</LedgerNum>
                <LedgerName>{a.dentist.user.name}</LedgerName>
                <LedgerMeta>{a.reason ?? "—"}</LedgerMeta>
                <AppointmentStatusInk status={a.status} />
              </LedgerRow>
            ))}
          </Ledger>
        )}
      </section>

      <Plate
        left="Appointments · visit history"
        right={`${upcoming.length} upcoming · ${past.length} past`}
      />
    </div>
  );
}

const STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "text-warning",
  CONFIRMED: "text-info",
  COMPLETED: "text-success",
  CANCELLED: "text-muted-foreground line-through",
  NO_SHOW: "text-destructive",
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

function AppointmentStatusInk({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "text-right font-mono text-[10px] uppercase tracking-wider",
        STATUS_TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
