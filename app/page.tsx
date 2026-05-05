import Link from "next/link";
import {
  CalendarRange,
  ClipboardList,
  Receipt,
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
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
              Banilad Dental Clinic. Now online.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Book a visit, check your treatment history, or pay your invoice
              from anywhere.
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
              title="See your records"
              body="Past visits, treatments, and invoices, kept where you can find them."
            />
            <Tile
              Icon={CalendarRange}
              title="Book a visit"
              body="Pick a time that works. Reschedule if something comes up."
            />
            <Tile
              Icon={Stethoscope}
              title="Chart what you treated"
              body="Click teeth on the chart, log the procedure, and the record updates."
            />
            <Tile
              Icon={Receipt}
              title="Send the bill"
              body="Issue an invoice, take payment, watch what's outstanding."
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
