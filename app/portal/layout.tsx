import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { RoleBadge } from "@/components/app/role-badge";
import { requirePatient } from "@/lib/auth/guards";

const navItems: NavItem[] = [
  { href: "/portal", label: "Overview", icon: "layout" },
  { href: "/portal/appointments", label: "Appointments", icon: "calendar" },
  { href: "/portal/treatments", label: "Treatments", icon: "fileText" },
  { href: "/portal/invoices", label: "Invoices", icon: "receipt" },
  { href: "/portal/profile", label: "Profile", icon: "profile" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePatient();

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-8">
        <Link href="/portal" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            B
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Banilad Dental Clinic</p>
            <p className="text-xs text-muted-foreground">Patient portal</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-background p-3 md:block">
          <SidebarNav items={navItems} />
        </aside>
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-4xl p-4 md:p-8">{children}</div>
        </main>
      </div>

      <Separator />
      <footer className="px-4 py-3 text-center text-xs text-muted-foreground md:px-8">
        © {new Date().getFullYear()} Banilad Dental Clinic
      </footer>
      <Toaster richColors closeButton />
    </div>
  );
}
