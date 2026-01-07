import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PowerTiles } from "@/components/dashboard/PowerTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Welcome Header */}
        <WelcomeHeader userName="Sarah" />

        {/* Stats Grid */}
        <StatsGrid />

        {/* Power Tiles - Core Actions */}
        <PowerTiles />

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
