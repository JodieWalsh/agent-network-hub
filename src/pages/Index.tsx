import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PowerTiles } from "@/components/dashboard/PowerTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user, profile } = useAuth();

  // Get user's first name from profile or user metadata
  const getUserFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return null;
  };

  const firstName = getUserFirstName();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Welcome Header */}
        <WelcomeHeader userName={firstName} />

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
