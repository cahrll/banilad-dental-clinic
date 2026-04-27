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
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="All dentists" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All dentists</SelectItem>
        {dentists.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
