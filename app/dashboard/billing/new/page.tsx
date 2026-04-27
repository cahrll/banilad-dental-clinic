import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { CreateInvoiceForm } from "./create-invoice-form";

export const metadata = { title: "New invoice · Banilad Dental Clinic" };

type SearchParams = { patientId?: string; treatmentIds?: string };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { patientId, treatmentIds } = await searchParams;

  if (!patientId) {
    return (
      <div className="space-y-6">
        <PageHeader title="New invoice" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Open a patient and click <strong>New invoice</strong> from their Invoices tab.
          </CardContent>
        </Card>
      </div>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  if (!patient || patient.deletedAt) {
    return (
      <div className="space-y-6">
        <PageHeader title="New invoice" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Patient not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const ids = treatmentIds ? treatmentIds.split(",").filter(Boolean) : [];
  const seedTreatments = ids.length
    ? await prisma.treatmentRecord.findMany({
        where: { id: { in: ids }, patientId: patient.id },
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          procedure: true,
          feeCents: true,
          performedAt: true,
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/dashboard/patients/${patient.id}`}>
          <ChevronLeft aria-hidden /> Back to patient
        </Link>
      </Button>

      <PageHeader
        title="New invoice"
        description={`For ${patient.firstName} ${patient.lastName}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Draft invoice</CardTitle>
          <CardDescription>
            We&apos;ll create a DRAFT first. You can add or remove items, then issue the invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateInvoiceForm patientId={patient.id} seedTreatments={seedTreatments.map((t) => ({
            id: t.id,
            procedure: t.procedure,
            feeCents: t.feeCents,
            performedAt: t.performedAt.toISOString(),
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}
