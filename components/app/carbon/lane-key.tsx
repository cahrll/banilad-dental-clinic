import { cn } from "@/lib/utils";


export type LaneKeyItem = {
  label: string;
  dotClass?: string;
};

export type LaneKeyProps = {
  items: LaneKeyItem[];
  className?: string;
};

export function LaneKey({ items, className }: LaneKeyProps) {

  return (
    <ul
      role="list"
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-border py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {items.map((it, i) => (
        <li key={i} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("inline-block size-2", it.dotClass ?? "bg-primary")}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
