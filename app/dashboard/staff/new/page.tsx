import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHead } from "@/components/app/carbon";
import { requireRole } from "@/lib/auth/guards";
import { StaffForm } from "../staff-form";

export const metadata = { title: "New staff · Banilad Dental Clinic" };

export default async function NewStaffPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit font-mono text-[11px] uppercase tracking-wider">
        <Link href="/dashboard/staff">
          <ChevronLeft aria-hidden /> Back to staff
        </Link>
      </Button>

      <PageHead
        crumb="/ staff / new"
        title="New staff member"
        description="Create an admin, dentist, or receptionist account. They sign in with the email and initial password you set."
      />

      <Card>
        <CardContent className="pt-6">
          <StaffForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
