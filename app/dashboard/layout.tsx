import { cookies } from "next/headers";
import Link from "next/link";
import type { Role } from "@/generated/prisma/client";
import { Toaster } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu";
import { requireStaff } from "@/lib/auth/guards";

const primaryNavItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "layout" },
  { href: "/dashboard/patients", label: "Patients", icon: "users" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "calendar" },
  { href: "/dashboard/treatments", label: "Treatments", icon: "stethoscope" },
  { href: "/dashboard/billing", label: "Billing", icon: "credit" },
];

const inventoryItem: NavItem = { href: "/dashboard/inventory", label: "Inventory", icon: "package" };
const staffItem: NavItem = { href: "/dashboard/staff", label: "Staff", icon: "staff" };
const reportsItem: NavItem = { href: "/dashboard/reports", label: "Reports", icon: "reports" };

function operationsItemsForRole(role: Role): NavItem[] {
  const items: NavItem[] = [inventoryItem];
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
  const operationsItems = operationsItemsForRole(user.role);

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-12 flex-row items-center border-b border-sidebar-border p-0 px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-[2px] bg-primary font-mono text-[13px] font-semibold leading-none text-primary-foreground"
            >
              B
            </span>
            <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em]">
                BANILAD
                <span className="ml-1 font-normal text-muted-foreground">
                  / clinic
                </span>
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav items={primaryNavItems} />
            </SidebarGroupContent>
          </SidebarGroup>
          {operationsItems.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel className="px-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                Operations
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarNav items={operationsItems} />
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarUserMenu
            name={user.name}
            email={user.email}
            role={user.role}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:hidden">
              Banilad <span className="text-foreground/30">/</span> clinic
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </div>
      </SidebarInset>
      <Toaster richColors closeButton />
    </SidebarProvider>
  );
}
