import type { Role } from "@/generated/prisma/client";
import { Toaster } from "@/components/ui/sonner";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { RoleBadge } from "@/components/app/role-badge";
import { LogoutButton } from "@/components/app/logout-button";
import { requireStaff } from "@/lib/auth/guards";

const baseNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "layout" },
  { href: "/dashboard/patients", label: "Patients", icon: "users" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "calendar" },
  { href: "/dashboard/treatments", label: "Treatments", icon: "stethoscope" },
  { href: "/dashboard/billing", label: "Billing", icon: "credit" },
  { href: "/dashboard/inventory", label: "Inventory", icon: "package" },
];

const staffItem: NavItem = { href: "/dashboard/staff", label: "Staff", icon: "staff" };
const reportsItem: NavItem = { href: "/dashboard/reports", label: "Reports", icon: "reports" };

function navItemsForRole(role: Role): NavItem[] {
  const items = [...baseNavItems];
  if (role === "ADMIN") items.push(staffItem, reportsItem);
  else if (role === "DENTIST") items.push(reportsItem);
  return items;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireStaff();
  const navItems = navItemsForRole(user.role);

  return (
    <div className="flex flex-1 bg-muted/20">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="grid size-8 place-items-center rounded-md bg-primary font-semibold text-primary-foreground">
            B
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Banilad Dental</span>
            <span className="text-xs text-muted-foreground">Clinic console</span>
          </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav items={navItems} />
        </div>
        <Separator />
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <RoleBadge role={user.role} />
          </div>
          <LogoutButton variant="outline" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
              B
            </span>
            <span className="text-sm font-semibold">Banilad Dental</span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </div>
      <Toaster richColors closeButton />
    </div>
  );
}
