import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
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
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { SearchInput } from "./search-input";
import { ShowArchivedToggle } from "./show-archived-toggle";

export const metadata = { title: "Patients · Banilad Dental Clinic" };

type SearchParams = { q?: string; archived?: string };

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
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${patients.length}${patients.length === 100 ? "+" : ""} ${showArchived ? "records (including archived)" : "active records"}`}
        actions={
          <Button asChild>
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
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">No patients found.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {query
                ? "Try a different search term."
                : "Add your first patient to get started."}
            </p>
            {!query ? (
              <Button asChild className="mt-2">
                <Link href="/dashboard/patients/new">Add patient</Link>
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
                <TableHead className="hidden md:table-cell">Date of birth</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/patients/${p.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {p.lastName}, {p.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {p.user.email.startsWith("noportal-") ? (
                      <span className="italic text-muted-foreground/70">No portal login</span>
                    ) : (
                      p.user.email
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(p.dateOfBirth)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {p.phone ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.deletedAt ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
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
