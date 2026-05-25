"use client";

import { useTransition } from "react";
import { CheckIcon, ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/lib/auth/actions";
import { RoleBadge } from "./role-badge";
import type { Role } from "@/generated/prisma/client";

export function SidebarUserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: Role;
}) {
  const { isMobile } = useSidebar();
  const { theme = "system", setTheme } = useTheme();
  const [pending, start] = useTransition();
  const initials = computeInitials(name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto gap-2.5 rounded-[2px] py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-[2px]">
                <AvatarFallback className="rounded-[2px] bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-medium">{name}</span>
                <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {email}
                </span>
              </div>
              <ChevronsUpDown
                aria-hidden
                className="ml-auto size-3.5 text-muted-foreground"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-[2px]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="size-8 rounded-[2px]">
                  <AvatarFallback className="rounded-[2px] bg-primary font-mono text-[11px] font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-[13px] font-medium">{name}</span>
                  <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center justify-between gap-2 font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
              Role
              <RoleBadge role={role} />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-mono text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => setTheme("light")}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Sun />
                Light
              </div>
              {theme === "light" && <CheckIcon />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setTheme("dark")}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Moon />
                Dark
              </div>
              {theme === "dark" && <CheckIcon />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setTheme("system")}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Monitor />
                System
              </div>
              {theme === "system" && <CheckIcon />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                start(() => logoutAction());
              }}
            >
              <LogOut />
              {pending ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
  ).toUpperCase();
}
