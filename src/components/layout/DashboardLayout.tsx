import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <TopBar />

        {/* Page Content */}
        <main className="p-5 lg:p-10 pb-28 lg:pb-12 max-w-screen-2xl mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <BottomNav />
    </div>
  );
}
