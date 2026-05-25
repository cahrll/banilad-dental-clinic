export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer
        data-tabular
        className="border-t border-border px-6 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
      >
        Banilad <span className="text-foreground/30">/</span> clinic ·
        operatory carbon
      </footer>
    </div>
  );
}
