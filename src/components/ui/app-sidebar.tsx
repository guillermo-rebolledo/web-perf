"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Activity,
  ChevronsUpDown,
  History,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Run History",
    url: "/history",
    icon: History,
  },
  {
    title: "Regression Alerts",
    url: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
  },
];

function ThemeItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={() => setTheme("light")}
        className={theme === "light" ? "bg-accent" : ""}
      >
        <Sun className="mr-2 h-4 w-4" />
        Light
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => setTheme("dark")}
        className={theme === "dark" ? "bg-accent" : ""}
      >
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => setTheme("system")}
        className={theme === "system" ? "bg-accent" : ""}
      >
        <Monitor className="mr-2 h-4 w-4" />
        System
      </DropdownMenuItem>
    </>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary transition-colors duration-150">
                  <Activity className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Performance Lab</span>
                  <span className="text-xs text-muted-foreground">
                    Monitor &amp; Analyze
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    className="transition-colors duration-150"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {session?.user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <span className="text-sm font-medium leading-none">
                        {(session.user.name || session.user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session.user.name || "User"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {session.user.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <ThemeItems />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() =>
                      void signOut({ callbackUrl: "/auth/signin" })
                    }
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
