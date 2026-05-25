import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/app/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";

export const metadata = { title: "Access denied · Banilad Dental Clinic" };

export default async function ForbiddenPage() {
  const session = await getCurrentUser();
  const homeHref = session ? homePathForRole(session.user.role) : "/login";

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <section className="flex w-full max-w-md flex-col gap-5 border border-destructive/40 bg-destructive/[0.04] p-6 sm:p-8">
        <p
          data-tabular
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive"
        >
          / forbidden · 403
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold tracking-tight">
            Access denied
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account doesn&apos;t have permission to view that page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href={homeHref}>
              Go to {session ? "your portal" : "sign in"}
            </Link>
          </Button>
          {session ? <LogoutButton variant="outline" /> : null}
        </div>
      </section>
    </div>
  );
}
