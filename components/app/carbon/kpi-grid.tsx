import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";


export type KpiGridProps = {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
};

const COLS_BY_N: Record<NonNullable<KpiGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function KpiGrid({ columns = 4, children, className }: KpiGridProps) {
  return (
    <div
      data-tabular
      className={cn(
        "grid gap-px border border-foreground/15 bg-border",
        COLS_BY_N[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}


export type KpiCellProps = {
  label: string;
  value: string;
  meta?: React.ReactNode;
  series?: number[];
  href?: string;
  tone?: "default" | "warning" | "success" | "destructive";
  subtle?: boolean;
};

const VALUE_TONE_CLASS: Record<NonNullable<KpiCellProps["tone"]>, string> = {
  default: "",
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
};

export function KpiCell({
  label,
  value,
  meta,
  series,
  href,
  tone = "default",
  subtle,
}: KpiCellProps) {
  const body = (
    <div className="relative grid h-full grid-rows-[auto_1fr_auto] gap-2 bg-card p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "self-start text-[28px] font-medium leading-none tracking-tight tabular-nums",
          subtle
            ? "text-muted-foreground"
            : tone === "default"
              ? "text-foreground"
              : VALUE_TONE_CLASS[tone],
        )}
      >
        {value}
      </span>
      {meta ? (
        <span className="text-xs text-muted-foreground">{meta}</span>
      ) : null}
      {series && series.length > 1 ? (
        <Sparkline series={series} className="absolute top-3 right-3 opacity-80" />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group/kpi block transition-colors hover:bg-muted/40"
      >
        {body}
      </Link>
    );
  }
  return body;
}
