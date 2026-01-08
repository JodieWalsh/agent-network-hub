import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  LogIn,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UnitToggle } from "@/components/ui/unit-toggle";

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

const userTypeLabels: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Settings"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Build dynamic nav items based on user role
  const dynamicNavItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    // Admin-only navigation
    ...(profile?.role === 'admin' ? [
      { label: "Admin Dashboard", icon: Shield, path: "/admin" },
    ] : []),
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

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/auth");
    setIsMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.children?.some((child) => location.pathname === child.path);

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || "U";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserType = () => {
    const type = user?.user_metadata?.user_type;
    return type ? userTypeLabels[type] || type : "Member";
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-card lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
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
          "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileOpen(false)}>
            <div className="w-8 h-8 rounded-md bg-forest/5 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-forest" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Agent Hub
              </h1>
              <p className="text-xs text-muted-foreground">Professional Network</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {dynamicNavItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                        isParentActive(item)
                          ? "bg-forest/5 text-forest"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon size={16} />
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
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150",
                                isActive(child.path)
                                  ? "bg-forest/5 text-forest font-medium"
                                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                              )}
                            >
                              <child.icon size={14} />
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
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                      isActive(item.path)
                        ? "bg-forest/5 text-forest"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Unit Toggle */}
        <div className="px-3 py-2 border-t border-sidebar-border">
          <UnitToggle />
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-md bg-forest/5 flex items-center justify-center">
                  <span className="text-xs font-semibold text-forest">{getUserInitials()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{getUserType()}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors duration-150"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium bg-forest text-white hover:bg-forest/90 transition-colors duration-150"
            >
              <LogIn size={16} />
              Sign In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
