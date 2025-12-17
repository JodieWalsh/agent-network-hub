import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PowerTiles } from "@/components/dashboard/PowerTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <WelcomeHeader userName="Sarah" />

        {/* Stats Grid */}
        <section>
          <StatsGrid />
        </section>

        {/* Power Tiles - Core Actions */}
        <section>
          <h2 className="text-lg font-serif font-semibold text-foreground mb-4 opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
            Quick Actions
          </h2>
          <PowerTiles />
        </section>

        {/* Recent Activity */}
        <section className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          
          {/* Network Highlights */}
          <div className="card-elegant p-6 opacity-0 animate-fade-in" style={{ animationDelay: "450ms" }}>
            <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
              Network Highlights
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-forest/5 to-transparent border border-forest/10">
                <p className="text-2xl font-serif font-semibold text-forest">1,247</p>
                <p className="text-sm text-muted-foreground">Agents in your region</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-rose-gold/10 to-transparent border border-rose-gold/20">
                <p className="text-2xl font-serif font-semibold text-rose-gold-dark">58</p>
                <p className="text-sm text-muted-foreground">New properties this week</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-burgundy/5 to-transparent border border-burgundy/10">
                <p className="text-2xl font-serif font-semibold text-burgundy">12</p>
                <p className="text-sm text-muted-foreground">Open inspection requests</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
