"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setInventoryActiveAction } from "@/lib/actions/inventory";

export function ToggleActiveButton({
  itemId,
  isActive,
}: {
  itemId: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setInventoryActiveAction(itemId, !isActive);
        })
      }
    >
      {isActive ? <Archive aria-hidden /> : <ArchiveRestore aria-hidden />}
      {isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
