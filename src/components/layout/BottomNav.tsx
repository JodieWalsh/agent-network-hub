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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E3D9CD] z-40 lg:hidden">
      <div className="flex items-center justify-around py-2 px-2 safe-area-pb">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              "flex min-h-[44px] min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200",
              isActive(item.path)
                ? "text-[#2D6350]"
                : "text-[#57534E] hover:text-[#1C1917]"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive(item.path) && "bg-[#B76E79]/10"
              )}
            >
              <item.icon
                size={20}
                className={cn(isActive(item.path) && "text-[#B76E79]")}
              />
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
