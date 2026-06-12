import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const userTypeLabels: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
  stylist: "Stylist",
  building_inspector: "Building Inspector",
};

export function TopBar() {
  const { user, profile } = useAuth();

  const getUserInitials = () => {
    if (!profile?.full_name && !user?.email) return "U";
    const name = profile?.full_name || user?.email || "User";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = () => {
    return profile?.full_name || user?.email || "User";
  };

  const getUserRoleDisplay = () => {
    if (profile?.role === 'admin') {
      return 'Administrator';
    }
    const type = profile?.user_type || user?.user_metadata?.user_type;
    const typeLabel = type ? userTypeLabels[type] || type : "Member";
    if (profile?.approval_status === 'approved' || profile?.is_verified) {
      return `${typeLabel} (Verified)`;
    } else if (profile?.approval_status === 'pending') {
      return `${typeLabel} (Unverified)`;
    } else if (profile?.approval_status === 'rejected') {
      return `${typeLabel} (Rejected)`;
    }
    return typeLabel;
  };

  return (
    <header className="sticky top-0 z-30 bg-[#F6F1EA]/95 backdrop-blur-xl border-b border-[#E3D9CD]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Spacer for mobile menu button */}
        <div className="w-10 lg:hidden" />

        {/* Search Bar — Premium Styling */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-0">
          <div className="relative group">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D6350]/70 group-focus-within:text-[#B76E79] transition-colors"
            />
            <input
              type="text"
              placeholder="Search agents, properties, forums..."
              className={cn(
                "w-full h-12 pl-12 pr-5 rounded-[16px]",
                "bg-white border border-[#E3D9CD]",
                "text-sm font-sans text-[#1C1917] placeholder:text-[#1C1917]/40",
                "focus:outline-none focus:ring-2 focus:ring-[#B76E79]/25 focus:border-[#B76E79]/40",
                "transition-all duration-300 shadow-[0_2px_12px_rgba(94,70,55,0.07)] hover:shadow-[0_4px_18px_rgba(94,70,55,0.1)]"
              )}
            />
          </div>
        </div>

        {/* Actions — Refined Icons */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Notifications */}
          <button
            className={cn(
              "relative p-2.5 rounded-xl bg-white text-[#2D6350] border border-[#E3D9CD] shadow-[0_2px_12px_rgba(94,70,55,0.07)]",
              "hover:bg-[#FBF8F3] transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[#B76E79]/25"
            )}
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={1.5} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#B76E79] rounded-full shadow-sm" />
          </button>

          {/* User Avatar - Desktop Only */}
          {user && (
            <div className="hidden lg:flex items-center gap-4 ml-2 pl-6 border-l border-[#E3D9CD]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={getUserName()}
                  className="w-10 h-10 rounded-lg border border-[#E3D9CD] object-cover ring-1 ring-[#B76E79]/30 hover:ring-[#B76E79]/50 transition-all"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg border border-[#E3D9CD] bg-white flex items-center justify-center transition-all">
                  <span className="text-xs font-semibold text-[#2D6350]">{getUserInitials()}</span>
                </div>
              )}
              <div className="hidden xl:block">
                <p className="text-sm font-semibold text-[#1C1917]">{getUserName()}</p>
                <p className="text-xs text-[#1C1917]/60">{getUserRoleDisplay()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
