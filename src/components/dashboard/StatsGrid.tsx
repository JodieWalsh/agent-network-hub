import { useState, useEffect } from "react";
import { Building2, ClipboardCheck, MessageSquare, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessageNotifications } from "@/contexts/MessageNotificationContext";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div
      className="rounded-[20px] border border-white/60 p-6 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16),0_6px_16px_rgba(94,70,55,0.1)] hover:shadow-[0_4px_8px_rgba(94,70,55,0.1),0_32px_68px_-8px_rgba(183,110,121,0.38),0_18px_44px_rgba(140,95,70,0.2),0_8px_20px_rgba(94,70,55,0.12)]"
      style={{
        background:
          "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 55%, rgba(246,241,234,0.68) 100%)",
        borderTop: "1px solid rgba(183,110,121,0.3)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B76E79]/12">
          <Icon size={16} className="text-[#B76E79]" />
        </div>
      </div>
      <div>
        <p className="font-sans text-4xl font-semibold tabular-nums text-[#2D6350]">{value}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#1C1917]">{label}</p>
      </div>
    </div>
  );
}

// Job statuses that count as "active" (excludes draft/completed/cancelled/expired)
const ACTIVE_JOB_STATUSES = "(open,assigned,in_progress,pending_review,pending_inspector_setup)";

function getAuthHeaders() {
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
  return { supabaseUrl, supabaseKey, accessToken };
}

/** Exact row count via PostgREST content-range header without fetching rows. */
async function fetchCount(pathAndQuery: string): Promise<number> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathAndQuery}`, {
    method: "HEAD",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "count=exact",
    },
  });
  if (!response.ok) return 0;
  const contentRange = response.headers.get("content-range"); // e.g. "0-9/42" or "*/0"
  const total = contentRange?.split("/")[1];
  return total && total !== "*" ? parseInt(total, 10) : 0;
}

async function fetchAverageRating(userId: string): Promise<string> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/inspection_reviews?select=rating&reviewee_id=eq.${userId}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) return "—";
  const rows: { rating: number }[] = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) return "—";
  const avg = rows.reduce((sum, r) => sum + (r.rating || 0), 0) / rows.length;
  return avg.toFixed(1);
}

export function StatsGrid() {
  const { user } = useAuth();
  const { unreadCount } = useMessageNotifications();
  const [inspectionsActive, setInspectionsActive] = useState<string | number>("—");
  const [propertiesListed, setPropertiesListed] = useState<string | number>("—");
  const [rating, setRating] = useState<string>("—");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      const [jobs, properties, avgRating] = await Promise.all([
        fetchCount(
          `inspection_jobs?select=id&requesting_agent_id=eq.${user.id}&status=in.${ACTIVE_JOB_STATUSES}`
        ),
        fetchCount(`properties?select=id&owner_id=eq.${user.id}`),
        fetchAverageRating(user.id),
      ]);
      if (cancelled) return;
      setInspectionsActive(jobs);
      setPropertiesListed(properties);
      setRating(avgRating);
    };

    load().catch((error) => {
      console.error("Failed to load dashboard stats:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = [
    { icon: ClipboardCheck, label: "Inspections Active", value: inspectionsActive },
    { icon: Building2, label: "Properties Listed", value: propertiesListed },
    { icon: MessageSquare, label: "Messages", value: unreadCount },
    { icon: Star, label: "Rating", value: rating },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
