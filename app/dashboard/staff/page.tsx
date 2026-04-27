import Link from "next/link";
import { Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { RoleBadge } from "@/components/app/role-badge";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { StaffFilters } from "./staff-filters";
import type { Role } from "@/generated/prisma/client";

export const metadata = { title: "Staff · Banilad Dental Clinic" };

type SearchParams = { q?: string; role?: string; inactive?: string };

const ROLE_FILTER_VALUES = ["ADMIN", "DENTIST", "RECEPTIONIST"] as const;

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
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={`${staff.length}${staff.length === 200 ? "+" : ""} ${roleFilter ? `${roleFilter.toLowerCase()} ` : ""}account${staff.length === 1 ? "" : "s"}${showInactive ? " (including inactive)" : ""}`}
        actions={
          <Button asChild size="sm">
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
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <UserCog className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No staff found.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query || roleFilter
                ? "Try clearing filters."
                : "Add your first staff member to get started."}
            </p>
            {!query && !roleFilter ? (
              <Button asChild className="mt-2">
                <Link href="/dashboard/staff/new">Add staff</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Title</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => {
                const title =
                  s.role === "DENTIST"
                    ? s.dentist?.specialty ?? "Dentist"
                    : s.staff?.position ?? "—";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/staff/${s.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {s.name}
                      </Link>
                      {s.phone ? (
                        <p className="text-xs text-muted-foreground">{s.phone}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {s.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={s.role} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {title}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
