"use client";

import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { state, isMobile } = useSidebar();
  const prefersReducedMotion = usePrefersReducedMotion();
  const expanded = state === "expanded" && !isMobile;

  return (
    <main
      className={cn(
        "min-h-svh transition-[margin-left]! ease-out!",
        prefersReducedMotion ? "duration-0!" : "duration-300!",
      )}
      style={{ marginLeft: expanded ? "var(--sidebar-width, 16rem)" : 0 }}
    >
      <div className="flex h-12 shrink-0 items-center px-4">
        <SidebarTrigger />
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </main>
  );
}
