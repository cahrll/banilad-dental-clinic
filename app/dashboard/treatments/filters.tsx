"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGE_OPTIONS = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export function TreatmentFilters({
  defaultQuery,
  defaultDentistId,
  defaultRange,
  dentists,
}: {
  defaultQuery: string;
  defaultDentistId: string;
  defaultRange: string;
  dentists: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [dentistId, setDentistId] = useState(defaultDentistId || "ALL");
  const [range, setRange] = useState(defaultRange || "90");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams();
      if (query.trim()) next.set("q", query.trim());
      if (dentistId && dentistId !== "ALL") next.set("dentistId", dentistId);
      if (range && range !== "90") next.set("range", range);
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dentistId, range]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder="Search by procedure…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          data-pending={isPending || undefined}
        />
      </div>
      <Select value={dentistId} onValueChange={setDentistId}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="All dentists" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All dentists</SelectItem>
          {dentists.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={range} onValueChange={setRange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
