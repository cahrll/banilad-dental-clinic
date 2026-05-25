export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="h-7 w-56" />
        <SkeletonBar className="h-3.5 w-72" />
      </div>

      <div className="grid gap-px border border-foreground/15 bg-border sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 bg-card p-4">
            <SkeletonBar className="h-2.5 w-24" />
            <SkeletonBar className="h-7 w-20" />
            <SkeletonBar className="h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBar key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-[2px] bg-foreground/[0.04] ${className ?? ""}`}
    />
  );
}
