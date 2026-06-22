import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Ledger,
  LedgerHead,
  LedgerRow,
  LedgerName,
  LedgerMeta,
  PageHead,
  Plate,
} from "@/components/app/carbon";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { ShowArchivedToggle } from "./show-archived-toggle";

export const metadata = { title: "Patients · Banilad Dental Clinic" };

type SearchParams = { q?: string; archived?: string };

const COLS = "minmax(0,1.6fr) minmax(0,1.4fr) 130px 130px 90px";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const { q, archived } = await searchParams;

  const query = q?.trim() ?? "";
  const showArchived = archived === "1";

  const patients = await prisma.patient.findMany({
    where: {
      // Match both stored-null and missing fields (MongoDB stores nothing
      // for optional fields not set on create; `equals: null` covers both).
      ...(showArchived ? {} : { deletedAt: { equals: null } }),
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { user: { email: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      sex: true,
      dateOfBirth: true,
      phone: true,
      deletedAt: true,
      user: { select: { email: true, isActive: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        crumb={`/ patients${showArchived ? " / + archived" : ""}${query ? ` / "${query}"` : ""}`}
        title="Patients"
        description={`${patients.length}${patients.length === 100 ? "+" : ""} ${showArchived ? "records · including archived" : "active records"}`}
        actions={
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/dashboard/patients/new">
              <Plus aria-hidden /> New patient
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput defaultValue={query} />
        <ShowArchivedToggle defaultChecked={showArchived} query={query} />
      </div>

      {patients.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {query
            ? "No matches. Try a different search term."
            : "No patients yet. Add your first to get started."}
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Name",
              "Email",
              "Date of birth",
              "Phone",
              { label: "Status", align: "right" },
            ]}
          />
          {patients.map((p) => {
            const archivedFlag = !!p.deletedAt;
            const portalEmail = p.user.email.startsWith("noportal-")
              ? null
              : p.user.email;
            return (
              <LedgerRow
                key={p.id}
                cols={COLS}
                href={`/dashboard/patients/${p.id}`}
              >
                <LedgerName>
                  {p.lastName}, {p.firstName}
                </LedgerName>
                <LedgerMeta>
                  {portalEmail ?? <span className="italic">No portal login</span>}
                </LedgerMeta>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatDate(p.dateOfBirth)}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {p.phone ?? "—"}
                </span>
                <span
                  className={cn(
                    "text-right font-mono text-[10px] uppercase tracking-wider",
                    archivedFlag ? "text-muted-foreground" : "text-success",
                  )}
                >
                  {archivedFlag ? "Archived" : "Active"}
                </span>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left="Patients · roster"
        right={`${patients.length} listed${patients.length === 100 ? " (capped)" : ""}`}
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
