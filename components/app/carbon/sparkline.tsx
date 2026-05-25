import { cn } from "@/lib/utils";


export type SparklineProps = {
  series: number[];
  width?: number;
  height?: number;
  className?: string;
  barClass?: string;
};

export function Sparkline({
  series,
  width = 80,
  height = 20,
  className,
  barClass = "bg-primary/70",
}: SparklineProps) {
  if (series.length === 0) return null;
  const max = Math.max(...series, 1);
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none flex items-end gap-px", className)}
      style={{ width, height }}
    >
      {series.map((v, i) => {
        const pct = max === 0 ? 4 : Math.max((v / max) * 100, 6);
        return (
          <span
            key={i}
            className={cn("block w-[3px]", barClass)}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}
