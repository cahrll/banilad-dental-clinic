import Link from "next/link";
import {
  CalendarRange,
  ClipboardList,
  Receipt,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/app/mode-toggle";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";

export const metadata = {
  title: "Banilad Dental Clinic",
  description:
    "Modern dental practice management — appointments, treatments, billing, and a patient portal.",
};

export default async function Home() {
  const session = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            B
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Banilad Dental Clinic
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session ? (
            <Button asChild>
              <Link href={homePathForRole(session.user.role)}>
                Go to {session.user.role === "PATIENT" ? "portal" : "dashboard"}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-8 px-6 py-20">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Custom auth · MongoDB · Next.js 16
            </span>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              The clinic console for Banilad Dental.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Manage patients, schedule appointments, record treatments, and
              issue invoices — all in one place. Patients get a dedicated portal
              to book and review their care.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {session ? (
              <Button asChild size="lg">
                <Link href={homePathForRole(session.user.role)}>
                  Open my {session.user.role === "PATIENT" ? "portal" : "dashboard"}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/register">Create patient account</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Staff sign in</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-5xl gap-4 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              Icon={ClipboardList}
              title="Patient records"
              body="Demographics, medical history, allergies, and dental charts."
            />
            <Tile
              Icon={CalendarRange}
              title="Appointments"
              body="Conflict-aware scheduling across dentists and chairs."
            />
            <Tile
              Icon={Stethoscope}
              title="Treatments"
              body="Tooth-level procedures linked to invoices and records."
            />
            <Tile
              Icon={Receipt}
              title="Billing"
              body="Invoices, payments, and balance tracking."
            />
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Banilad Dental Clinic
      </footer>
    </div>
  );
}

function Tile({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
