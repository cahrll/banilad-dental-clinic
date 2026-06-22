"use client";

import { useRouter } from "next/navigation";

export function InventoryShowInactiveToggle({
  defaultChecked,
  query,
}: {
  defaultChecked: boolean;
  query: string;
}) {
  const router = useRouter();
  return (
    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={(e) => {
          const next = new URLSearchParams();
          if (query) next.set("q", query);
          if (e.target.checked) next.set("inactive", "1");
          const queryString = next.toString();
          router.replace(queryString ? `?${queryString}` : "?");
        }}
        className="size-3.5 rounded-[2px] border-input accent-primary"
      />
      Show inactive
    </label>
  );
}
