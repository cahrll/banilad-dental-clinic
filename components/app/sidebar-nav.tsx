"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ICONS = {
  layout: LayoutDashboard,
  users: Users,
  calendar: CalendarRange,
  stethoscope: Stethoscope,
  credit: CreditCard,
  package: Package,
  staff: UserCog,
  reports: BarChart3,
  fileText: FileText,
  receipt: Receipt,
  profile: UserRound,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  count?: string;
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.label}
              className={cn(
                "h-8 gap-2.5 rounded-[2px] px-2.5 py-1.5 text-[13px] tracking-[-0.005em]",
                "data-active:bg-sidebar-primary data-active:font-semibold data-active:text-sidebar-primary-foreground",
              )}
            >
              <Link href={item.href}>
                <Icon aria-hidden className="size-4 opacity-80" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.count ? (
                  <span
                    aria-hidden
                    data-tabular
                    className={cn(
                      "font-mono text-[10px] tabular-nums tracking-wider",
                      active
                        ? "text-sidebar-primary-foreground/75"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/portal") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
