import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">
              B
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Banilad Dental Clinic
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
