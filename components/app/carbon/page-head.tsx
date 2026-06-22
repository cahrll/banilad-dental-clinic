import { cn } from "@/lib/utils";


export type PageHeadProps = {
  crumb?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: "page" | "section";
  as?: "h1" | "h2" | "h3";
};

export function PageHead({
  crumb,
  title,
  description,
  actions,
  variant = "page",
  as,
}: PageHeadProps) {
  const Heading = (as ?? (variant === "page" ? "h1" : "h2")) as
    | "h1"
    | "h2"
    | "h3";

  const titleClass =
    variant === "page"
      ? "text-[26px] font-semibold tracking-tight leading-[1.1]"
      : "text-lg font-semibold tracking-tight";

  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border",
        variant === "page" ? "pb-4" : "pb-3",
      )}
    >
      <div className="min-w-0">
        {crumb ? (
          <p
            data-tabular
            className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums"
          >
            {crumb}
          </p>
        ) : null}
        <Heading className={titleClass}>{title}</Heading>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
