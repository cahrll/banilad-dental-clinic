"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  LOWER_LEFT,
  LOWER_RIGHT,
  TOOTH_STATUS_DOT_VAR,
  TOOTH_STATUS_LABELS,
  UPPER_LEFT,
  UPPER_RIGHT,
  type ToothConditionMap,
} from "@/lib/teeth";
import type { ToothStatus } from "@prisma/client";

export type DentalChartMode = "view" | "select";

export function DentalChart({
  conditions,
  mode = "view",
  selected = [],
  onToothClick,
  onToggleSelect,
}: {
  conditions: ToothConditionMap;
  mode?: DentalChartMode;
  selected?: number[];
  onToothClick?: (tooth: number) => void;
  onToggleSelect?: (tooth: number) => void;
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function handleClick(tooth: number) {
    if (mode === "select") onToggleSelect?.(tooth);
    else onToothClick?.(tooth);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <Row label="Upper" right={UPPER_RIGHT} left={UPPER_LEFT} conditions={conditions} selectedSet={selectedSet} mode={mode} onClick={handleClick} />
        <Row label="Lower" right={LOWER_RIGHT} left={LOWER_LEFT} conditions={conditions} selectedSet={selectedSet} mode={mode} onClick={handleClick} reverse />
      </div>
      <Legend />
    </div>
  );
}

function Row({
  label,
  right,
  left,
  conditions,
  selectedSet,
  mode,
  onClick,
  reverse,
}: {
  label: string;
  right: readonly number[];
  left: readonly number[];
  conditions: ToothConditionMap;
  selectedSet: Set<number>;
  mode: DentalChartMode;
  onClick: (tooth: number) => void;
  reverse?: boolean;
}) {
  const rightTeeth = reverse ? [...right].reverse() : right;
  const leftTeeth = reverse ? [...left].reverse() : left;
  return (
    <div className="flex items-stretch gap-2">
      <span className="w-12 shrink-0 self-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="grid grid-cols-8 gap-1">
        {rightTeeth.map((t) => (
          <ToothButton
            key={t}
            tooth={t}
            status={conditions[t]}
            selected={selectedSet.has(t)}
            mode={mode}
            onClick={() => onClick(t)}
          />
        ))}
      </div>
      <div className="self-stretch border-l border-dashed border-border" />
      <div className="grid grid-cols-8 gap-1">
        {leftTeeth.map((t) => (
          <ToothButton
            key={t}
            tooth={t}
            status={conditions[t]}
            selected={selectedSet.has(t)}
            mode={mode}
            onClick={() => onClick(t)}
          />
        ))}
      </div>
    </div>
  );
}

function ToothButton({
  tooth,
  status,
  selected,
  mode,
  onClick,
}: {
  tooth: number;
  status: ToothStatus | undefined;
  selected: boolean;
  mode: DentalChartMode;
  onClick: () => void;
}) {
  const dotColor = status
    ? TOOTH_STATUS_DOT_VAR[status]
    : "var(--muted-foreground)";
  return (
    <button
      type="button"
      onClick={onClick}
      data-tooth-status={status ?? undefined}
      data-selected={selected || undefined}
      title={status ? `${tooth} · ${TOOTH_STATUS_LABELS[status]}` : `${tooth} · No condition recorded`}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 rounded-sm border px-1.5 py-1.5 transition-colors",
        "min-w-[36px]",
        !status && "border-border bg-background text-foreground hover:bg-muted",
        status && "hover:border-foreground/30",
        mode === "select" && "cursor-pointer",
        "data-[selected=true]:ring-2 data-[selected=true]:ring-primary data-[selected=true]:ring-offset-1",
      )}
    >
      <span className="font-mono text-[11px] font-medium leading-none tabular-nums">
        {tooth}
      </span>
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      {Object.entries(TOOTH_STATUS_LABELS).map(([key, label]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: TOOTH_STATUS_DOT_VAR[key as ToothStatus] }}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}
