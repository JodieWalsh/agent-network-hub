import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Spacer for mobile menu button */}
        <div className="w-10 lg:hidden" />

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4 lg:mx-0">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search agents, properties, or forums..."
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-lg",
                "bg-muted/50 border border-border",
                "text-sm placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            className={cn(
              "relative p-2.5 rounded-lg",
              "hover:bg-muted transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
            aria-label="Notifications"
          >
            <Bell size={20} className="text-foreground" />
            {/* Notification Badge */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-gold rounded-full animate-pulse-soft" />
          </button>

          {/* User Avatar - Desktop Only */}
          <div className="hidden lg:flex items-center gap-3 ml-2 pl-4 border-l border-border">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-foreground">SM</span>
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-medium">Sarah Mitchell</p>
              <p className="text-xs text-muted-foreground">Buyers Agent</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
