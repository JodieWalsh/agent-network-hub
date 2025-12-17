import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Directory", icon: Users, path: "/directory" },
  { label: "Properties", icon: Building2, path: "/marketplace" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 safe-area-pb">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
              isActive(item.path)
                ? "text-forest"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                isActive(item.path) && "bg-rose-gold"
              )}
            >
              <item.icon
                size={20}
                className={cn(isActive(item.path) && "text-forest")}
              />
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
