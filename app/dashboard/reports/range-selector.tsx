"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

export function RangeSelector({ value }: { value: string }) {
  const router = useRouter();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        router.replace(next === "90" ? "?" : `?range=${next}`);
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-44 rounded-[2px] font-mono text-[11px] uppercase tracking-wider"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-[2px]">
        {OPTIONS.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="font-mono text-[12px]"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
