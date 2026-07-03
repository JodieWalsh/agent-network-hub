/**
 * CrmSnapshot.tsx — CRM Phase 2: dashboard widgets + quick actions.
 *
 * READ-ONLY view over the CRM tables (clients, client_tasks) — never briefs.
 * Data access: raw fetch to Supabase REST only. Never import the supabase client.
 * Ownership: every query filters agent_id = logged-in user (owner-only RLS).
 * Visibility: rendered only for users holding CAN_MANAGE_CLIENT_BRIEFS —
 * the same gate as the /clients routes (subscription-tier gate lands there
 * later, Dani item #23, so this component needs no extra gating).
 *
 * "Needs attention" matches the needsAttention() rule on Clients.tsx exactly
 * (active status, live lifecycle, next action missing or overdue) so the
 * dashboard number always agrees with the flags on the Clients list.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CalendarClock, Contact, ChevronRight } from "lucide-react";
import { useAuth, usePermissions } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";

interface SnapshotClient {
  id: string;
  household_name: string;
  lifecycle_stage: string;
  client_status: string;
  next_action_date: string | null;
  next_action_type: string | null;
}

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

/** Live (non-closed) clients for this agent, no-next-action first then oldest. */
async function fetchLiveClients(agentId: string): Promise<SnapshotClient[]> {
  const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/clients?select=id,household_name,lifecycle_stage,client_status,next_action_date,next_action_type&agent_id=eq.${agentId}&lifecycle_stage=not.in.(closed_won,closed_lost)&order=next_action_date.asc.nullsfirst`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) return [];
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

/** Same rule as Clients.tsx: a live client needs a next action; flag when missing or overdue. */
function needsAttention(client: SnapshotClient): boolean {
  if (client.client_status !== "active") return false;
  if (!client.next_action_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(client.next_action_date + "T00:00:00") < today;
}

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function attentionReason(client: SnapshotClient): string {
  if (!client.next_action_date) return "No next action set";
  const what = client.next_action_type || "next action";
  return `Overdue: ${what} — due ${formatDate(client.next_action_date)}`;
}

/** Frosted metric card (same treatment as StatsGrid), clickable → /clients. */
function SnapshotCard({
  icon: Icon,
  label,
  value,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label}: ${loading ? "loading" : value}. View clients`}
      className="rounded-[20px] border border-white/60 p-6 text-left backdrop-blur-md transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79] shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16),0_6px_16px_rgba(94,70,55,0.1)] hover:shadow-[0_4px_8px_rgba(94,70,55,0.1),0_32px_68px_-8px_rgba(183,110,121,0.38),0_18px_44px_rgba(140,95,70,0.2),0_8px_20px_rgba(94,70,55,0.12)]"
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
      {loading ? (
        <div className="h-10 w-14 animate-pulse rounded-lg bg-[#2D6350]/10" />
      ) : (
        <p className="font-sans text-4xl font-semibold tabular-nums text-[#2D6350]">{value}</p>
      )}
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#1C1917]">{label}</p>
    </button>
  );
}

export function CrmSnapshot() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeHouseholds, setActiveHouseholds] = useState(0);
  const [tasksDueToday, setTasksDueToday] = useState(0);
  const [needingAttention, setNeedingAttention] = useState<SnapshotClient[]>([]);

  const canAccessCrm = hasPermission(permissions, "CAN_MANAGE_CLIENT_BRIEFS");

  useEffect(() => {
    if (!user || !canAccessCrm) return;

    let cancelled = false;
    const load = async () => {
      // Local-midnight boundaries so "today" means the agent's day, not UTC's.
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [liveClients, dueToday] = await Promise.all([
        fetchLiveClients(user.id),
        fetchCount(
          `client_tasks?select=id&agent_id=eq.${user.id}&status=eq.open&due_at=gte.${dayStart.toISOString()}&due_at=lt.${dayEnd.toISOString()}`
        ),
      ]);
      if (cancelled) return;
      setActiveHouseholds(liveClients.length);
      setNeedingAttention(liveClients.filter(needsAttention));
      setTasksDueToday(dueToday);
      setLoading(false);
    };

    load().catch((error) => {
      console.error("Failed to load CRM snapshot:", error);
      if (!cancelled) setLoading(false); // graceful fallback: friendly zeros
    });

    return () => {
      cancelled = true;
    };
  }, [user, canAccessCrm]);

  if (!canAccessCrm) return null;

  const preview = needingAttention.slice(0, 3);

  return (
    <section className="rounded-[24px] border border-[#2D6350]/12 bg-white/80 p-8 shadow-[0_6px_24px_rgba(94,70,55,0.07)] backdrop-blur-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#8F4E58]">
            Client relationships
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-[#173A31]">
            Your households
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate("/clients")}
            className="w-full sm:w-auto min-h-[44px] rounded-full border border-[#2D6350]/30 bg-white/70 px-7 py-3 text-sm font-semibold tracking-[0.05em] text-[#2D6350] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B76E79] hover:text-[#8F4E58]"
          >
            View Clients
          </button>
          <button
            onClick={() => navigate("/clients/new")}
            className="w-full sm:w-auto min-h-[44px] rounded-full bg-[#2D6350] px-7 py-3 text-sm font-semibold tracking-[0.05em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.12),0_5px_16px_rgba(23,58,49,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B76E79] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_26px_rgba(183,110,121,0.38)]"
          >
            New Client
          </button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <SnapshotCard
          icon={AlertCircle}
          label="Clients Needing Attention"
          value={needingAttention.length}
          loading={loading}
          onClick={() => navigate("/clients")}
        />
        <SnapshotCard
          icon={CalendarClock}
          label="Tasks Due Today"
          value={tasksDueToday}
          loading={loading}
          onClick={() => navigate("/clients")}
        />
        <SnapshotCard
          icon={Contact}
          label="Active Households"
          value={activeHouseholds}
          loading={loading}
          onClick={() => navigate("/clients")}
        />
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#8F4E58]">
          Needs attention
        </p>
        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#2D6350]/[0.06]" />
            ))}
          </div>
        ) : preview.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[#2D6350]/20 bg-[#F6F1EA]/60 px-6 py-7 text-center text-sm text-[#57534E]">
            ✦ You're all caught up — every household has a clear next step.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {preview.map((client) => (
              <li key={client.id}>
                <button
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#2D6350]/12 bg-white/70 px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B76E79]/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B76E79]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg font-semibold text-[#173A31]">
                      {client.household_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[#8F4E58]">
                      {attentionReason(client)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[#B76E79]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
