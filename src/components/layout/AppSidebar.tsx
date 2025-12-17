import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardCheck,
  MessageSquare,
  MessagesSquare,
  Settings,
  ChevronDown,
  User,
  CreditCard,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  children?: { label: string; icon: React.ElementType; path: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Agent Directory", icon: Users, path: "/directory" },
  { label: "Property Marketplace", icon: Building2, path: "/marketplace" },
  { label: "Inspection Requests", icon: ClipboardCheck, path: "/inspections" },
  { label: "Forums", icon: MessagesSquare, path: "/forums" },
  { label: "Messaging", icon: MessageSquare, path: "/messages" },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
    children: [
      { label: "Profile Edit", icon: User, path: "/settings/profile" },
      { label: "Billing", icon: CreditCard, path: "/settings/billing" },
      { label: "Notifications", icon: Bell, path: "/settings/notifications" },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Settings"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.children?.some((child) => location.pathname === child.path);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-elegant lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
            <div className="w-10 h-10 rounded-lg bg-rose-gold flex items-center justify-center">
              <Building2 className="w-5 h-5 text-forest" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-sidebar-foreground">
                Agent Hub
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Professional Network</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isParentActive(item)
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon size={18} />
                        {item.label}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform duration-200",
                          expandedItems.includes(item.label) && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedItems.includes(item.label) && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-sidebar-border space-y-1">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <Link
                              to={child.path}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                isActive(child.path)
                                  ? "bg-rose-gold text-forest font-medium"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                              )}
                            >
                              <child.icon size={16} />
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive(item.path)
                        ? "bg-rose-gold text-forest"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-rose-gold flex items-center justify-center">
              <span className="text-sm font-semibold text-forest">SM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Sarah Mitchell
              </p>
              <p className="text-xs text-sidebar-foreground/60">Buyers Agent</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
