"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";

type PatientHit = { id: string; firstName: string; lastName: string };

export function PatientPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navPending, startNav] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/patients/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Search failed (${res.status}).`);
        const rows: PatientHit[] = await res.json();
        if (!cancelled) setResults(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed.");
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  function pick(id: string) {
    startNav(() => {
      router.push(`/dashboard/treatments/new?patientId=${encodeURIComponent(id)}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoFocus
          type="search"
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
          data-pending={loading || undefined}
        />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-md border bg-background">
        {error ? (
          <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
        ) : loading && results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {query.trim() ? "No matches." : "Start typing to search."}
          </p>
        ) : (
          <ul className="divide-y">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p.id)}
                  disabled={navPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 disabled:opacity-60"
                >
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                  <span className="font-medium">
                    {p.lastName}, {p.firstName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
