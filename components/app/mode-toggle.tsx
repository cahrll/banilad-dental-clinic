"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ModeToggleProps = {
  compact?: boolean;
  className?: string;
};

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function ModeToggle({ compact = false, className }: ModeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex gap-px border border-border bg-border",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && resolvedTheme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/50",
              compact ? "h-7 w-7 p-0" : "min-w-[5.5rem] flex-1 px-2 py-1.5",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {!compact ? <span>{label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
