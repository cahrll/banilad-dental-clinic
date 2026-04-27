"use client";

import { useState, useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { setStaffActiveAction } from "@/lib/actions/staff";

export function ToggleActiveButton({
  staffUserId,
  isActive,
  isSelf,
}: {
  staffUserId: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isSelf && isActive) {
    // Hide the deactivate option for self — server-side guards also prevent it.
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setStaffActiveAction(staffUserId, !isActive);
            if (!res.ok) setError(res.error ?? "Couldn't update.");
          })
        }
      >
        {isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
        {isActive ? "Deactivate" : "Reactivate"}
      </Button>
      {error ? (
        <Alert variant="destructive" className="w-72">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
