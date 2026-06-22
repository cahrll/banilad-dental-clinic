import Link from "next/link";
import { cn } from "@/lib/utils";


export type LedgerProps = {
  children: React.ReactNode;
  className?: string;
};

export function Ledger({ children, className }: LedgerProps) {
  
  return (
    <div className={cn("border-b border-border", className)}>{children}</div>
  );
}

export type LedgerRowProps = {
  children: React.ReactNode;
  href?: string;
  cols: string;
  className?: string;
};

export function LedgerRow({ children, href, cols, className }: LedgerRowProps) {
  const rowClass = cn(
    "grid items-baseline gap-3 border-t border-border px-1 py-3 first:border-t-0",
    href && "transition-colors hover:bg-muted/40",
    className,
  );
  const style = { gridTemplateColumns: cols };

  if (href) {
    return (
      <Link href={href} className={rowClass} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={rowClass} style={style}>
      {children}
    </div>
  );
}


export function LedgerNum({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-wider tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

export function LedgerName({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <span className="min-w-0 truncate text-sm font-medium">
      {children}
      {sub ? (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {sub}
        </span>
      ) : null}
    </span>
  );
}

export function LedgerMeta({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate text-xs text-muted-foreground">{children}</span>
  );
}

export function LedgerAmt({
  children,
  balance,
  tone,
}: {
  children: React.ReactNode;
  balance?: React.ReactNode;
  tone?: "default" | "warning" | "success" | "destructive";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "destructive"
          ? "text-destructive"
          : "";
  return (
    <span className="text-right">
      <span
        className={cn(
          "block font-mono text-sm font-medium tabular-nums",
          toneClass,
        )}
      >
        {children}
      </span>
      {balance ? (
        <span className="block font-mono text-[10px] uppercase tracking-wider tabular-nums text-muted-foreground">
          {balance}
        </span>
      ) : null}
    </span>
  );
}

export function LedgerHead({
  cols,
  labels,
  className,
}: {
  cols: string;
  labels: (string | { label: string; align?: "left" | "right" })[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-end gap-3 px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
      style={{ gridTemplateColumns: cols }}
    >
      {labels.map((l, i) => {
        const text = typeof l === "string" ? l : l.label;
        const align = typeof l === "string" ? "left" : l.align;
        return (
          <span key={i} className={align === "right" ? "text-right" : ""}>
            {text}
          </span>
        );
      })}
    </div>
  );
}
