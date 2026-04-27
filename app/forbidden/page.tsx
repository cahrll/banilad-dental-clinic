import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/app/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";

export const metadata = { title: "Access denied · Banilad Dental Clinic" };

export default async function ForbiddenPage() {
  const session = await getCurrentUser();
  const homeHref = session ? homePathForRole(session.user.role) : "/login";

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" aria-hidden />
            <CardTitle>Access denied</CardTitle>
          </div>
          <CardDescription>
            Your account doesn&apos;t have permission to view that page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={homeHref}>Go to {session ? "your portal" : "sign in"}</Link>
          </Button>
          {session ? <LogoutButton variant="outline" /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
