"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex flex-col gap-5 border border-destructive/40 bg-destructive/[0.04] p-6 sm:p-8">
      <p
        data-tabular
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive"
      >
        / error · 500
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred while loading this view. Try again, or
          reload the page if it persists.
        </p>
      </div>
      {error.digest ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Reference · {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={reset}
          size="sm"
          className="font-mono text-[11px] uppercase tracking-wider"
        >
          Try again
        </Button>
      </div>
    </section>
  );
}
