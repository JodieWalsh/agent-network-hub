import { useNavigate } from "react-router-dom";
import { Building2, Droplets, Landmark, Map } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PowerTiles } from "@/components/dashboard/PowerTiles";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Logged-out users see the marketing landing page
  if (loading) return null;
  if (!user) return <Landing />;

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

  const quickActions = [
    { label: "New Brief", path: "/briefs/new" },
    { label: "Post Property", path: "/marketplace/add" },
    { label: "Review Offers", path: "/inspections" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero welcome card — deep forest gradient */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#173A31] to-[#2D6350] p-10 lg:p-12 shadow-[0_24px_60px_rgba(23,58,49,0.28)]">
          {/* Aurora gradient overlay — ambient light bleeding in from top right */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 92% -10%, rgba(183,110,121,0.45), transparent 60%), radial-gradient(ellipse 45% 50% at 75% 5%, rgba(216,195,184,0.35), transparent 65%), radial-gradient(ellipse 55% 65% at 5% 105%, rgba(216,195,184,0.18), transparent 60%)",
            }}
          />
          {/* Soft light bloom in the corner itself */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(216,195,184,0.35) 0%, rgba(183,110,121,0.18) 45%, transparent 70%)",
              filter: "blur(12px)",
            }}
          />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-[#D8C3B8]">
              Signature buyers agent experience
            </p>
            <h1 className="mt-5 font-serif text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <div className="mt-5 h-[3px] w-24 rounded-full bg-[#B76E79]" />
            <p className="mt-7 max-w-2xl text-base leading-7 text-white">
              Your private command centre for off-market opportunities, client
              briefs, and trusted professional connections.
            </p>
          </div>
        </section>

        {/* Quick action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="rounded-full bg-[#2D6350] px-8 py-3.5 text-sm font-semibold tracking-[0.05em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.12),0_5px_16px_rgba(23,58,49,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B76E79] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_26px_rgba(183,110,121,0.38)]"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Stats row — frosted metric cards */}
        <StatsGrid />

        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="space-y-6">
            {/* Curated actions */}
            <section className="rounded-[24px] border border-[#2D6350]/12 bg-white/80 p-8 shadow-[0_6px_24px_rgba(94,70,55,0.07)] backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#8F4E58]">
                Command centre
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#173A31]">
                Curated actions
              </h2>
              <div className="mt-7">
                <PowerTiles />
              </div>
            </section>

            {/* Property spotlight */}
            <section className="overflow-hidden rounded-[24px] border border-[#2D6350]/12 bg-white shadow-[0_6px_24px_rgba(94,70,55,0.07)]">
              <div className="relative h-44 bg-gradient-to-br from-[#2D6350] to-[#173A31]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 size={44} strokeWidth={1} className="text-[#D8C3B8]" />
                </div>
                <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#173A31] backdrop-blur-sm">
                    <Droplets size={12} className="text-[#2D6350]" />
                    Low flood risk
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#173A31] backdrop-blur-sm">
                    <Landmark size={12} className="text-[#B76E79]" />
                    No heritage overlay
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#173A31] backdrop-blur-sm">
                    <Map size={12} className="text-[#2D6350]" />
                    Zoned R2
                  </span>
                </div>
              </div>
              <div className="p-7">
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#8F4E58]">
                  Property spotlight
                </p>
                <h3 className="mt-3 font-serif text-2xl font-semibold text-[#173A31]">
                  Off-market opportunity, Mosman NSW
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#1C1917]">
                  Four-bedroom federation home with harbour glimpses, presented
                  exclusively to network members ahead of public listing.
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-lg font-semibold tabular-nums text-[#2D6350]">
                    $3,250,000 guide
                  </p>
                  <button
                    onClick={() => navigate("/marketplace")}
                    className="rounded-full bg-[#2D6350] px-5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B76E79]"
                  >
                    View Listing
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Recent activity feed */}
          <div className="space-y-6">
            <RecentActivity />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
