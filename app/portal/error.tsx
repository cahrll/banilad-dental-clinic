"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PortalError({
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
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
          <CardTitle>Something went wrong</CardTitle>
        </div>
        <CardDescription>
          We couldn&apos;t load this page. Please try again, or contact the
          clinic if the problem persists.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
        <Button onClick={reset} variant="outline" className="w-fit">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
