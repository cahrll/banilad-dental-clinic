import { cookies } from "next/headers";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarNav, type NavItem } from "@/components/app/sidebar-nav";
import { SidebarUserMenu } from "@/components/app/sidebar-user-menu";
import { requirePatient } from "@/lib/auth/guards";

const navItems: NavItem[] = [
  { href: "/portal", label: "Overview", icon: "layout" },
  { href: "/portal/appointments", label: "Appointments", icon: "calendar" },
  { href: "/portal/treatments", label: "Treatments", icon: "fileText" },
  { href: "/portal/invoices", label: "Invoices", icon: "receipt" },
  { href: "/portal/profile", label: "Profile", icon: "profile" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePatient();

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-12 flex-row items-center border-b border-sidebar-border p-0 px-2">
          <Link
            href="/portal"
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
                  / portal
                </span>
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarNav items={navItems} />
            </SidebarGroupContent>
          </SidebarGroup>
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
              Banilad <span className="text-foreground/30">/</span> portal
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </div>
      </SidebarInset>
      <Toaster richColors closeButton />
    </SidebarProvider>
  );
}
