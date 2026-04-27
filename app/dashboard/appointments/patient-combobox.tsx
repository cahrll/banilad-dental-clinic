"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type PatientOption = { id: string; firstName: string; lastName: string };

export function PatientCombobox({ name }: { name: string }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [selected, setSelected] = useState<PatientOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/patients/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setOptions([]);
          return;
        }
        setOptions((await res.json()) as PatientOption[]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, selected]);

  const display = useMemo(
    () => (selected ? `${selected.firstName} ${selected.lastName}` : ""),
    [selected],
  );

  if (selected) {
    return (
      <>
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span>{display}</span>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
          >
            Change
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value="" />
      <Input
        type="search"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {(query.length > 0 || options.length > 0) && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matches.</p>
          ) : (
            <ul className="py-1 text-sm">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setSelected(o)}
                    className="block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
                  >
                    {o.lastName}, {o.firstName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
