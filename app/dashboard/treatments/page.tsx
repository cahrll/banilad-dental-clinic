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
  LedgerAmt,
  PageHead,
  Plate,
} from "@/components/app/carbon";
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

const RANGE_LABEL: Record<string, string> = {
  "30": "last 30 days",
  "90": "last 90 days",
  "365": "last 12 months",
  all: "all time",
};

function isRangeKey(v: string | undefined): v is keyof typeof RANGE_DAYS {
  return v === "30" || v === "90" || v === "365" || v === "all";
}

const COLS = "100px minmax(0,1.4fr) minmax(0,1.2fr) minmax(0,1fr) 110px";

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
    <div className="flex flex-col gap-8">
      <PageHead
        crumb={`/ treatments / ${RANGE_LABEL[rangeKey]}${query ? ` / "${query}"` : ""}`}
        title="Treatments"
        description={`${treatments.length}${treatments.length === 100 ? "+" : ""} record${treatments.length === 1 ? "" : "s"}${treatments.length > 0 ? ` · ${formatCents(totalCents)}` : ""}`}
        actions={
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/dashboard/treatments/new">
              <Plus aria-hidden /> Record
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
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {query || dentistFilter || rangeKey !== "90"
            ? "No treatments match these filters."
            : "No treatments recorded yet. Use Record to log one."}
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Date",
              "Patient",
              "Procedure",
              "Teeth · dentist",
              { label: "Fee", align: "right" },
            ]}
          />
          {treatments.map((t) => {
            const teeth =
              t.toothEntries.length === 0
                ? "—"
                : formatTeeth(t.toothEntries.map((e) => e.toothNumber));
            return (
              <LedgerRow
                key={t.id}
                cols={COLS}
                href={`/dashboard/patients/${t.patient.id}#treatments`}
              >
                <LedgerNum>{formatDate(t.performedAt)}</LedgerNum>
                <LedgerName>
                  {t.patient.lastName}, {t.patient.firstName}
                </LedgerName>
                <LedgerMeta>{t.procedure}</LedgerMeta>
                <LedgerMeta>
                  {teeth} · {t.dentist.user.name}
                </LedgerMeta>
                <LedgerAmt>{formatCents(t.feeCents)}</LedgerAmt>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left={`Treatments · ${RANGE_LABEL[rangeKey]}`}
        right={`total ${formatCents(totalCents)}`}
      />
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
