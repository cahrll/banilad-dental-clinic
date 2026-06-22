import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHead } from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { PatientForm } from "../patient-form";

export const metadata = { title: "New patient · Banilad Dental Clinic" };

export default async function NewPatientPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href="/dashboard/patients">
          <ChevronLeft aria-hidden /> Back to patients
        </Link>
      </Button>
      <PageHead crumb="/ patients / new" title="New patient" description="Create a patient record. A portal account is optional." />
      <Card>
        <CardContent className="pt-6">
          <PatientForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
