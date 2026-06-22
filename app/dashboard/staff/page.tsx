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
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { StaffFilters } from "./staff-filters";
import type { Role } from "@/generated/prisma/client";

export const metadata = { title: "Staff · Banilad Dental Clinic" };

type SearchParams = { q?: string; role?: string; inactive?: string };

const ROLE_FILTER_VALUES = ["ADMIN", "DENTIST", "RECEPTIONIST"] as const;

const COLS = "minmax(0,1.6fr) minmax(0,1.4fr) 110px minmax(0,1fr) 90px";

export default async function StaffListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const { q, role, inactive } = await searchParams;

  const query = q?.trim() ?? "";
  const roleFilter = (ROLE_FILTER_VALUES as readonly string[]).includes(role ?? "")
    ? (role as Role)
    : undefined;
  const showInactive = inactive === "1";

  const staff = await prisma.user.findMany({
    where: {
      role: roleFilter ?? { in: ["ADMIN", "DENTIST", "RECEPTIONIST"] },
      ...(showInactive ? {} : { isActive: true }),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      dentist: { select: { specialty: true, licenseNo: true } },
      staff: { select: { position: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        crumb={`/ staff${roleFilter ? ` / ${roleFilter.toLowerCase()}` : ""}${query ? ` / "${query}"` : ""}`}
        title="Staff"
        description={`${staff.length}${staff.length === 200 ? "+" : ""} ${roleFilter ? `${roleFilter.toLowerCase()} ` : ""}account${staff.length === 1 ? "" : "s"}${showInactive ? " · including inactive" : ""}`}
        actions={
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/dashboard/staff/new">
              <Plus aria-hidden /> New staff
            </Link>
          </Button>
        }
      />

      <StaffFilters
        defaultQuery={query}
        defaultRole={roleFilter ?? ""}
        defaultShowInactive={showInactive}
      />

      {staff.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {query || roleFilter
            ? "No matches. Try clearing filters."
            : "No staff on file yet. Add your first to get started."}
        </p>
      ) : (
        <Ledger>
          <LedgerHead
            cols={COLS}
            labels={[
              "Name",
              "Email",
              "Role",
              "Title",
              { label: "Status", align: "right" },
            ]}
          />
          {staff.map((s) => {
            const title =
              s.role === "DENTIST"
                ? s.dentist?.specialty ?? "Dentist"
                : s.staff?.position ?? "—";
            return (
              <LedgerRow
                key={s.id}
                cols={COLS}
                href={`/dashboard/staff/${s.id}`}
              >
                <LedgerName sub={s.phone ? `· ${s.phone}` : undefined}>
                  {s.name}
                </LedgerName>
                <LedgerMeta>{s.email}</LedgerMeta>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.role.toLowerCase()}
                </span>
                <LedgerMeta>{title}</LedgerMeta>
                <span
                  className={cn(
                    "text-right font-mono text-[10px] uppercase tracking-wider",
                    s.isActive ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </LedgerRow>
            );
          })}
        </Ledger>
      )}

      <Plate
        left="Staff · access register"
        right={`${staff.length} account${staff.length === 1 ? "" : "s"} listed`}
      />
    </div>
  );
}
