"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DentistFilter({
  dentists,
  selected,
}: {
  dentists: Array<{ id: string; name: string }>;
  selected?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <Select
      value={selected ?? "all"}
      onValueChange={(value) => {
        const next = new URLSearchParams(Array.from(params.entries()));
        if (value === "all") next.delete("dentistId");
        else next.set("dentistId", value);
        const q = next.toString();
        router.replace(q ? `?${q}` : "?");
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-[200px] rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
      >
        <SelectValue placeholder="All dentists" />
      </SelectTrigger>
      <SelectContent className="rounded-[2px]">
        <SelectItem value="all" className="font-mono text-[12px]">
          All dentists
        </SelectItem>
        {dentists.map((d) => (
          <SelectItem key={d.id} value={d.id} className="text-[13px]">
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
