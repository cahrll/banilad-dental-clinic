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

const ROLE_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "DENTIST", label: "Dentist" },
  { value: "RECEPTIONIST", label: "Receptionist" },
];

export function StaffFilters({
  defaultQuery,
  defaultRole,
  defaultShowInactive,
}: {
  defaultQuery: string;
  defaultRole: string;
  defaultShowInactive: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [role, setRole] = useState(defaultRole || "ALL");
  const [showInactive, setShowInactive] = useState(defaultShowInactive);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams();
      if (query.trim()) next.set("q", query.trim());
      if (role && role !== "ALL") next.set("role", role);
      if (showInactive) next.set("inactive", "1");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `?${qs}` : "?");
      });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role, showInactive]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 rounded-[2px] pl-8 font-mono text-[12px]"
            data-pending={isPending || undefined}
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger
            size="sm"
            className="h-9 w-full rounded-[2px] font-mono text-[11px] uppercase tracking-wider sm:w-44"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-[2px]">
            {ROLE_OPTIONS.map((o) => (
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
      </div>
      <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="size-3.5 rounded-[2px] border-input accent-primary"
        />
        Show inactive
      </label>
    </div>
  );
}
