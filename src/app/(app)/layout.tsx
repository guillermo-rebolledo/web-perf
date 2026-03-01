import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider className="block">
      <AppSidebar />
      <SidebarLayout>{children}</SidebarLayout>
    </SidebarProvider>
  );
}
