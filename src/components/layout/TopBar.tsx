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
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Spacer for mobile menu button */}
        <div className="w-10 lg:hidden" />

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4 lg:mx-0">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search agents, properties, or forums..."
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-lg",
                "bg-muted/50 border border-border",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold/40 focus:bg-white",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            className={cn(
              "relative p-2 rounded-lg",
              "hover:bg-muted transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-rose-gold/20"
            )}
            aria-label="Notifications"
          >
            <Bell size={18} className="text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-gold rounded-full" />
          </button>

          {/* User Avatar - Desktop Only */}
          {user && (
            <div className="hidden lg:flex items-center gap-3 ml-2 pl-4 border-l border-border">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={getUserName()}
                  className="w-9 h-9 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg border border-border bg-muted/50 flex items-center justify-center">
                  <span className="text-xs font-semibold text-foreground">{getUserInitials()}</span>
                </div>
              )}
              <div className="hidden xl:block">
                <p className="text-sm font-medium">{getUserName()}</p>
                <p className="text-xs text-muted-foreground">{getUserRoleDisplay()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
