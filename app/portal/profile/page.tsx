import { UserRound } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
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
      <div className="space-y-6">
        <PageHeader title="My profile" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Your patient record isn&apos;t set up yet. Please contact the clinic.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your account and clinic record. Contact the clinic to update any of these details."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Account">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
        </Section>

        <Section title="Personal">
          <Row
            label="Full name"
            value={`${patient.firstName} ${patient.lastName}`}
          />
          <Row label="Sex" value={sexLabel(patient.sex)} />
          <Row
            label="Date of birth"
            value={`${formatDate(patient.dateOfBirth)} · ${ageInYears(patient.dateOfBirth)} yrs`}
          />
        </Section>

        <Section title="Contact">
          <Row label="Phone" value={patient.phone} />
          <Row label="Address" value={patient.address} multiline />
        </Section>

        <Section title="Emergency contact">
          <Row label="Name" value={patient.emergencyContactName} />
          <Row label="Phone" value={patient.emergencyContactPhone} />
        </Section>

        <Section title="Medical">
          <Row label="History" value={patient.medicalHistory} multiline />
          <Row label="Allergies" value={patient.allergies} multiline />
        </Section>

        <Section title="Insurance">
          <Row label="Provider" value={patient.insuranceProvider} />
          <Row label="Policy #" value={patient.insurancePolicyNo} />
        </Section>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <UserRound
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <p>
            To update your contact details, allergies, or insurance, message the
            front desk and reception will keep your record current.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
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
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value ? (
        <p className={multiline ? "whitespace-pre-wrap" : "truncate"}>{value}</p>
      ) : (
        <p className="text-muted-foreground">—</p>
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
