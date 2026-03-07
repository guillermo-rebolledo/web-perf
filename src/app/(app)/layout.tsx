import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import { SessionGuard } from "@/components/session-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="block">
      <SessionGuard />
      <AppSidebar />
      <SidebarLayout>{children}</SidebarLayout>
    </SidebarProvider>
  );
}
