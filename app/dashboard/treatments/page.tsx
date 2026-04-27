import Link from "next/link";
import { Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { TreatmentFilters } from "./filters";

export const metadata = { title: "Treatments · Banilad Dental Clinic" };

type SearchParams = { q?: string; dentistId?: string; range?: string };

const RANGE_DAYS: Record<string, number | null> = {
  "30": 30,
  "90": 90,
  "365": 365,
  all: null,
};

function isRangeKey(v: string | undefined): v is keyof typeof RANGE_DAYS {
  return v === "30" || v === "90" || v === "365" || v === "all";
}

export default async function TreatmentsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { q, dentistId, range } = await searchParams;
  const query = q?.trim() ?? "";
  const rangeKey = isRangeKey(range) ? range : "90";
  const days = RANGE_DAYS[rangeKey];

  const dentists = await prisma.dentist.findMany({
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });

  const dentistOptions = dentists.map((d) => ({
    id: d.id,
    name: d.user.name,
  }));
  const dentistFilter = dentistOptions.some((d) => d.id === dentistId)
    ? dentistId
    : undefined;

  const since = days === null ? undefined : (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const treatments = await prisma.treatmentRecord.findMany({
    where: {
      ...(since ? { performedAt: { gte: since } } : {}),
      ...(dentistFilter ? { dentistId: dentistFilter } : {}),
      ...(query
        ? {
            procedure: { contains: query, mode: "insensitive" },
          }
        : {}),
    },
    orderBy: { performedAt: "desc" },
    take: 100,
    select: {
      id: true,
      procedure: true,
      performedAt: true,
      feeCents: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentist: { select: { user: { select: { name: true } } } },
      toothEntries: { select: { toothNumber: true } },
    },
  });

  const totalCents = treatments.reduce((acc, t) => acc + t.feeCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatments"
        description={`${treatments.length}${treatments.length === 100 ? "+" : ""} record${treatments.length === 1 ? "" : "s"}${treatments.length > 0 ? ` · ${formatCents(totalCents)}` : ""}.`}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/treatments/new">
              <Plus aria-hidden /> Record treatment
            </Link>
          </Button>
        }
      />

      <TreatmentFilters
        defaultQuery={query}
        defaultDentistId={dentistFilter ?? ""}
        defaultRange={rangeKey}
        dentists={dentistOptions}
      />

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <Stethoscope className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No treatments found.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query || dentistFilter || rangeKey !== "90"
                ? "Try clearing filters or widening the date range."
                : "Click Record treatment to log one."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/dashboard/treatments/new">Record treatment</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead className="hidden md:table-cell">Teeth</TableHead>
                <TableHead className="hidden sm:table-cell">Dentist</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {treatments.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(t.performedAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/patients/${t.patient.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {t.patient.lastName}, {t.patient.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>{t.procedure}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {formatTeeth(t.toothEntries.map((e) => e.toothNumber))}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {t.dentist.user.name}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCents(t.feeCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
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

function formatTeeth(nums: number[]): string {
  if (nums.length === 0) return "—";
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length <= 3) return sorted.join(", ");
  return `${sorted.slice(0, 3).join(", ")} +${sorted.length - 3}`;
}
