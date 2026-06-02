import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PowerTiles } from "@/components/dashboard/PowerTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const getUserFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ")[0];
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(" ")[0];
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return null;
  };

  const firstName = getUserFirstName();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-[#E8E5DC] bg-[#FAFAF8] p-10 shadow-card">
          <div className="inline-flex items-center gap-3 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-[#7F6A2D]">
            Signature buyers agent experience
          </div>

          <div className="mt-8 max-w-3xl">
            <h1 className="font-serif text-5xl font-semibold tracking-tight text-[#0A0A0A] sm:text-6xl lg:text-7xl">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <div className="mt-4 h-1 w-28 rounded-full bg-[#C9A84C]" />
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-700">
              A luxury command center for buyers agents — clean, calm, and designed to make every property insight feel elevated.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {[
              { label: "New Brief", mode: "primary", path: "/briefs/new" },
              { label: "Post Property", mode: "primary", path: "/marketplace/add" },
              { label: "Review Offers", mode: "secondary", path: "/inspections" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                  action.mode === "primary"
                    ? "bg-[#064E3B] text-white shadow-sm hover:bg-[#0d5f48]"
                    : "border border-[#064E3B] bg-white text-[#064E3B] hover:bg-[#064E3B]/5"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Off-market listings", value: "72" },
              { label: "Active briefs", value: "14" },
              { label: "Client approvals", value: "98%" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-[#E8E5DC] bg-white p-6 shadow-subtle">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{stat.label}</p>
                <p className="mt-4 text-4xl font-serif font-semibold text-[#0A0A0A]">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#E8E5DC] bg-white p-8 shadow-subtle">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Market overview</p>
                  <h2 className="mt-3 text-3xl font-serif font-semibold text-[#0A0A0A]">Premium metrics</h2>
                </div>
                <div className="inline-flex rounded-full border border-[#E8E5DC] bg-[#FAFAF8] px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-600">
                  Designed for high-end agents
                </div>
              </div>
              <div className="mt-8">
                <StatsGrid />
              </div>
            </section>

            <section className="rounded-[28px] border border-[#E8E5DC] bg-white p-8 shadow-subtle">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Command center</p>
                  <h2 className="mt-3 text-3xl font-serif font-semibold text-[#0A0A0A]">Curated actions</h2>
                </div>
                <p className="text-sm text-slate-600 max-w-xl">
                  Navigate the most important workflows with confidence and clarity.
                </p>
              </div>
              <div className="mt-8">
                <PowerTiles />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#E8E5DC] bg-white p-8 shadow-subtle">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Recent activity</p>
                <h2 className="mt-3 text-3xl font-serif font-semibold text-[#0A0A0A]">Live client momentum</h2>
              </div>
              <div className="mt-6">
                <RecentActivity />
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
