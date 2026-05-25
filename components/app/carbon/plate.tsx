import { cn } from "@/lib/utils";


export type PlateProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

export function Plate({ left, right, className }: PlateProps) {
  return (
    <div
      data-tabular
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {left ? <span>{left}</span> : <span />}
      {right ? <span>{right}</span> : null}
    </div>
  );
}
