import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/permissions";

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
    if (profile?.role) {
      return getRoleLabel(profile.role);
    }
    return "Member";
  };

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 lg:px-8">
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
                "w-full h-9 pl-10 pr-4 rounded-md",
                "bg-white border border-border",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary",
                "transition-colors duration-150"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            className={cn(
              "relative p-2 rounded-md",
              "hover:bg-muted transition-colors duration-150",
              "focus:outline-none focus:ring-1 focus:ring-primary/20"
            )}
            aria-label="Notifications"
          >
            <Bell size={18} className="text-foreground" />
            {/* Notification Badge */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-gold rounded-full" />
          </button>

          {/* User Avatar - Desktop Only */}
          {user && (
            <div className="hidden lg:flex items-center gap-3 ml-2 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-md border border-border bg-white flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground">{getUserInitials()}</span>
              </div>
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
