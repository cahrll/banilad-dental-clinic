import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/app/mode-toggle";
import { NowTag, Plate } from "@/components/app/carbon";
import { getCurrentUser } from "@/lib/auth/current-user";
import { homePathForRole } from "@/lib/auth/roles";

export const metadata = {
  title: "Banilad Dental Clinic",
  description:
    "Book a visit, check your treatment history, settle your invoice. Clinical practice management for Banilad Dental Clinic, Cebu.",
};

export default async function Home() {
  const session = await getCurrentUser();
  const targetHref = session ? homePathForRole(session.user.role) : null;
  const targetLabel = session
    ? session.user.role === "PATIENT"
      ? "Open portal"
      : "Open dashboard"
    : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-[2px] bg-primary font-mono text-[13px] font-semibold leading-none text-primary-foreground"
          >
            B
          </span>
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em]">
            BANILAD
            <span className="ml-1 font-normal text-muted-foreground">
              / clinic
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle compact />
          {session && targetHref && targetLabel ? (
            <Button
              asChild
              size="sm"
              className="font-mono text-[11px] uppercase tracking-wider"
            >
              <Link href={targetHref}>{targetLabel}</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="font-mono text-[11px] uppercase tracking-wider"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="font-mono text-[11px] uppercase tracking-wider"
              >
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — bigger Geist display, mono eyebrow + crumb */}
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-20 md:py-28">
          <div
            data-tabular
            className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span>/ banilad · cebu</span>
            <NowTag tone="primary">clinical operations</NowTag>
          </div>

          <h1 className="max-w-3xl text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] md:text-[72px]">
            Your records,
            <br />
            your appointments,
            <br />
            <span className="text-muted-foreground">your bills.</span>{" "}
            <span className="text-primary">In one place.</span>
          </h1>

          <p className="max-w-prose text-base text-muted-foreground md:text-lg">
            Book a visit. Check your treatment history. Settle your invoice.
            From anywhere, anytime.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {session && targetHref && targetLabel ? (
              <Button
                asChild
                size="lg"
                className="rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
              >
                <Link href={targetHref}>{targetLabel}</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
              >
                <Link href="/register">Book your first visit →</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Feature plates — etched 4-up */}
        <section className="border-y border-border bg-background">
          <div className="mx-auto grid w-full max-w-5xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              number="01"
              title="Records"
              body="Past visits, treatments, and invoices, where you can find them."
            />
            <Tile
              number="02"
              title="Booking"
              body="Pick a time. Reschedule if something changes. Two-hour lead time."
            />
            <Tile
              number="03"
              title="Chart"
              body="FDI 11 through 48. Click a tooth, log the procedure, the chart updates."
            />
            <Tile
              number="04"
              title="Billing"
              body="Issue an invoice, take payment, watch what&apos;s open."
            />
          </div>
        </section>

        {/* Tagline strip */}
        <section className="mx-auto w-full max-w-5xl px-6 py-14">
          <p className="max-w-3xl text-xl font-medium leading-snug tracking-tight md:text-2xl">
            Patient records, appointments, treatments, invoices: one console.
            <span className="text-muted-foreground">
              {" "}
              One source of truth for the clinic.
            </span>
          </p>
        </section>
      </main>

      <Plate
        left={`© ${new Date().getFullYear()} · Banilad Dental Clinic · Cebu, PH`}
        right="Mon–Sat · 09:00–17:00 PHT"
      />
    </div>
  );
}

function Tile({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article className="flex flex-col gap-3 bg-card p-6 md:p-8">
      <span
        data-tabular
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
      >
        {number}
      </span>
      <h2 className="text-lg font-semibold tracking-tight md:text-xl">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
