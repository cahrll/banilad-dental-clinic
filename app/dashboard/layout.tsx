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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu";
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

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="text-sm font-semibold">B</span>
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold">
                      Banilad Dental
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Clinic console
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav items={navItems} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarUserMenu
            name={user.name}
            email={user.email}
            role={user.role}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <span className="text-sm font-medium md:hidden">Banilad Dental</span>
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
