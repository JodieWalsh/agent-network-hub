import { useState, useEffect } from "react";
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
  FileText,
  Search,
  Plus,
  Briefcase,
  ClipboardList,
  Sparkles,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Badge } from "@/components/ui/badge";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";

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
  stylist: "Stylist",
  building_inspector: "Building Inspector",
};

const membershipLabels: Record<string, string> = {
  free: "Free Member",
  basic: "Basic Member",
  premium: "Premium Member",
};

const membershipColors: Record<string, string> = {
  free: "bg-white/10 text-white/70 border-white/20",
  basic: "bg-white/10 text-rose-gold border-rose-gold/30",
  premium: "bg-rose-gold/20 text-rose-gold border-rose-gold/40",
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Settings"]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasPostedJobs, setHasPostedJobs] = useState(false);
  const [hasInspectionWork, setHasInspectionWork] = useState(false);
  const { unreadCount: unreadMessageCount } = useMessageNotifications();

  // Check if user has posted any inspection jobs or has inspection work
  useEffect(() => {
    const checkInspectionActivity = async () => {
      if (!user) {
        setHasPostedJobs(false);
        setHasInspectionWork(false);
        return;
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        let accessToken = supabaseKey;
        try {
          const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
          const storedSession = localStorage.getItem(storageKey);
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed?.access_token || supabaseKey;
          }
        } catch (e) {}

        // Check for posted jobs
        const postedJobsResponse = await fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?select=id&requesting_agent_id=eq.${user.id}&limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (postedJobsResponse.ok) {
          const data = await postedJobsResponse.json();
          setHasPostedJobs(Array.isArray(data) && data.length > 0);
        }

        // Check for inspection work (bids submitted OR assigned jobs)
        const bidsResponse = await fetch(
          `${supabaseUrl}/rest/v1/inspection_bids?select=id&inspector_id=eq.${user.id}&limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        const assignedJobsResponse = await fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?select=id&assigned_inspector_id=eq.${user.id}&limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        const hasBids = bidsResponse.ok && (await bidsResponse.json()).length > 0;
        const hasAssignedJobs = assignedJobsResponse.ok && (await assignedJobsResponse.json()).length > 0;
        setHasInspectionWork(hasBids || hasAssignedJobs);
      } catch (error) {
        console.error('Error checking inspection activity:', error);
      }
    };

    checkInspectionActivity();
  }, [user]);

  // Build dynamic nav items based on user role
  const dynamicNavItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    // Admin-only navigation
    ...(profile?.role === 'admin' ? [
      { label: "Admin Dashboard", icon: Shield, path: "/admin" },
      { label: "Forum Moderation", icon: Shield, path: "/forums/admin" },
    ] : []),
    { label: "Agent Directory", icon: Users, path: "/directory" },
    { label: "Property Marketplace", icon: Building2, path: "/marketplace" },
    {
      label: "Inspections",
      icon: ClipboardCheck,
      path: "/inspections",
      children: [
        { label: "Browse Spotlights", icon: Search, path: "/inspections/spotlights" },
        { label: "Post a Job", icon: Plus, path: "/inspections/jobs/new" },
        ...(hasPostedJobs ? [
          { label: "My Posted Jobs", icon: Briefcase, path: "/inspections/my-jobs" },
        ] : []),
        ...(hasInspectionWork ? [
          { label: "My Inspection Work", icon: ClipboardList, path: "/inspections/my-work" },
        ] : []),
      ],
    },
    // Verified professionals and admins can create briefs
    ...(profile?.role === 'verified_professional' || profile?.role === 'admin' ? [
      { label: "Client Briefs", icon: FileText, path: "/briefs" },
    ] : []),
    { label: "Forums", icon: MessagesSquare, path: "/forums" },
    { label: "Messaging", icon: MessageSquare, path: "/messages" },
    { label: "Pricing", icon: Sparkles, path: "/pricing" },
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
    console.log('Sign Out button clicked');
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      setIsMobileOpen(false);
      navigate("/auth");
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: "Could not sign out. Please try again.",
      });
    }
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

  const getMembershipTier = () => {
    return profile?.subscription_tier || 'free';
  };

  const getMembershipLabel = () => {
    const tier = getMembershipTier();
    return membershipLabels[tier] || 'Free Member';
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-forest text-white shadow-card lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar — Dark Forest Green */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center" onClick={() => setIsMobileOpen(false)}>
            <img
              src="/images/logo/logo-option-1.svg"
              alt="Buyers Agent Hub"
              className="h-15 w-auto brightness-0 invert"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {dynamicNavItems.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isParentActive(item)
                          ? "bg-sidebar-accent text-rose-gold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon size={17} />
                        {item.label}
                      </span>
                      <ChevronDown
                        size={15}
                        className={cn(
                          "transition-transform duration-200 opacity-60",
                          expandedItems.includes(item.label) && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedItems.includes(item.label) && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-sidebar-border space-y-0.5">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <Link
                              to={child.path}
                              onClick={() => setIsMobileOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                isActive(child.path)
                                  ? "text-rose-gold font-medium"
                                  : "text-sidebar-foreground/70 hover:text-white"
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive(item.path)
                        ? "bg-sidebar-accent text-rose-gold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                    )}
                  >
                    <item.icon size={17} />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Messaging" && unreadMessageCount > 0 && (
                      <Badge
                        variant="default"
                        className="bg-rose-gold text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-0"
                      >
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </Badge>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || user.email || 'User'}
                    className="w-9 h-9 rounded-lg object-cover ring-2 ring-white/20"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-xs font-semibold text-white">{getUserInitials()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{getUserType()}</p>
                </div>
                <NotificationBell />
              </div>
              {/* Membership Badge */}
              <div className="px-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "w-full justify-center text-xs py-1",
                    membershipColors[getMembershipTier()]
                  )}
                >
                  {getMembershipTier() === 'premium' && <Crown className="w-3 h-3 mr-1" />}
                  {getMembershipLabel()}
                </Badge>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white transition-all duration-200"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center justify-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium bg-rose-gold text-white hover:bg-rose-gold-dark transition-all duration-200"
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
