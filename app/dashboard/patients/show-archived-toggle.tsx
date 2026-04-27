"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

export function ShowArchivedToggle({
  defaultChecked,
  query,
}: {
  defaultChecked: boolean;
  query: string;
}) {
  const router = useRouter();
  return (
    <Label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={(e) => {
          const next = new URLSearchParams();
          if (query) next.set("q", query);
          if (e.target.checked) next.set("archived", "1");
          const queryString = next.toString();
          router.replace(queryString ? `?${queryString}` : "?");
        }}
        className="size-4 rounded border-input"
      />
      Show archived
    </Label>
  );
}
