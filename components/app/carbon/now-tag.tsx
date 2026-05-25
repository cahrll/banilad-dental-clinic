import { cn } from "@/lib/utils";


export type NowTagProps = {
  children: React.ReactNode;
  tone?: "primary" | "muted" | "warning" | "success" | "destructive";
};

const DOT_BY_TONE: Record<NonNullable<NowTagProps["tone"]>, string> = {
  primary: "bg-primary",
  muted: "bg-muted-foreground",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
};

export function NowTag({ children, tone = "primary" }: NowTagProps) {
  return (
    <span
      data-tabular
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums"
    >
      <span
        aria-hidden
        className={cn("inline-block size-1.5 rounded-full", DOT_BY_TONE[tone])}
      />
      {children}
    </span>
  );
}
