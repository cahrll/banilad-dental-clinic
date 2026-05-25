import { PageHead, Plate } from "@/components/app/carbon";
import { requirePatient } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata = { title: "My profile · Banilad Dental Clinic" };

export default async function PatientProfilePage() {
  const { user } = await requirePatient();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: {
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      phone: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      medicalHistory: true,
      allergies: true,
      insuranceProvider: true,
      insurancePolicyNo: true,
      deletedAt: true,
    },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead crumb="/ profile" title="My profile" />
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Your patient record isn&apos;t set up yet. Please contact the clinic.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHead
        crumb="/ profile"
        title="My profile"
        description="Your account and clinic record. Contact the clinic to update any of these details."
      />

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 01 / account" title="Account" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 02 / personal" title="Personal" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Row
            label="Full name"
            value={`${patient.firstName} ${patient.lastName}`}
          />
          <Row label="Sex" value={sexLabel(patient.sex)} />
          <Row
            label="Date of birth"
            value={`${formatDate(patient.dateOfBirth)} · ${ageInYears(patient.dateOfBirth)} yrs`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 03 / contact" title="Contact" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Phone" value={patient.phone} />
          <Row label="Address" value={patient.address} multiline />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PageHead
          variant="section"
          crumb="§ 04 / emergency"
          title="Emergency contact"
        />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Name" value={patient.emergencyContactName} />
          <Row label="Phone" value={patient.emergencyContactPhone} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 05 / medical" title="Medical" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="History" value={patient.medicalHistory} multiline />
          <Row label="Allergies" value={patient.allergies} multiline />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <PageHead variant="section" crumb="§ 06 / insurance" title="Insurance" />
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Row label="Provider" value={patient.insuranceProvider} />
          <Row label="Policy #" value={patient.insurancePolicyNo} />
        </div>
      </section>

      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        To update any of these details, message the front desk and reception
        will keep your record current.
      </p>

      <Plate left="Profile · my record" right={user.email} />
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
      {value ? (
        <p
          className={
            multiline ? "mt-0.5 whitespace-pre-wrap" : "mt-0.5 truncate"
          }
        >
          {value}
        </p>
      ) : (
        <p className="mt-0.5 text-muted-foreground">—</p>
      )}
    </div>
  );
}

const sexLabels = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  UNDISCLOSED: "Sex undisclosed",
} as const;

function sexLabel(s: keyof typeof sexLabels) {
  return sexLabels[s];
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function ageInYears(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}
