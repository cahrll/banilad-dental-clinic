import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-16">
      <section className="flex w-full max-w-md flex-col gap-5 border border-border bg-card p-6 sm:p-8">
        <p
          data-tabular
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          / not found · 404
        </p>
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/">Go home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
