/**
 * Clients.tsx — CRM Phase 1: the Clients workspace (list view).
 *
 * Design: quiet luxury (CLAUDE.md DESIGN VISION) — do NOT copy briefs styling.
 * Data access: raw fetch to Supabase REST only. Never import the supabase client.
 * Ownership: every query filters agent_id = logged-in user (owner-only RLS).
 * Plan: docs/CRM_ROADMAP.md (Phase 1).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Contact, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface ClientRow {
  id: string;
  household_name: string;
  household_type: string | null;
  lifecycle_stage: string;
  buying_stage: string | null;
  client_status: string;
  next_action_type: string | null;
  next_action_date: string | null;
  last_contact_at: string | null;
  created_at: string;
}

interface MemberSummary {
  client_id: string;
  full_name: string;
  is_primary_contact: boolean;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  new_enquiry: "New Enquiry",
  discovery_booked: "Discovery Booked",
  discovery_completed: "Discovery Completed",
  engaged: "Engaged",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const BUYING_LABELS: Record<string, string> = {
  brief_confirmed: "Brief Confirmed",
  search_active: "Search Active",
  inspecting: "Inspecting",
  shortlist_formed: "Shortlist Formed",
  due_diligence: "Due Diligence",
  offer_submitted: "Offer Submitted",
  negotiation: "Negotiation",
  under_contract: "Under Contract",
  settlement_support: "Settlement Support",
};

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

/** A live client needs a next action; flag when missing or overdue. */
function needsAttention(client: ClientRow): boolean {
  const closed =
    client.lifecycle_stage === "closed_won" ||
    client.lifecycle_stage === "closed_lost" ||
    client.client_status !== "active";
  if (closed) return false;
  if (!client.next_action_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(client.next_action_date + "T00:00:00") < today;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Muted, elegant lifecycle badge — forest tint. */
function LifecycleBadge({ stage }: { stage: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#2D6350]/25 bg-[#2D6350]/[0.08] px-3 py-1 font-sans text-xs font-medium text-[#2D6350]">
      {LIFECYCLE_LABELS[stage] || stage}
    </span>
  );
}

/** Buying-stage badge — subtly different (champagne/rose tint, square-ish). */
function BuyingBadge({ stage }: { stage: string | null }) {
  if (!stage) return null;
  return (
    <span className="inline-flex items-center rounded-md border border-[#B76E79]/30 bg-[#B76E79]/[0.09] px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58]">
      {BUYING_LABELS[stage] || stage}
    </span>
  );
}

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [membersByClient, setMembersByClient] = useState<Record<string, MemberSummary[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
        const headers = { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` };

        const res = await fetch(
          `${supabaseUrl}/rest/v1/clients?select=id,household_name,household_type,lifecycle_stage,buying_stage,client_status,next_action_type,next_action_date,last_contact_at,created_at&agent_id=eq.${user.id}&order=updated_at.desc`,
          { headers }
        );
        if (!res.ok) throw new Error(`Fetch clients failed: ${res.status}`);
        const rows: ClientRow[] = await res.json();
        setClients(rows);

        if (rows.length > 0) {
          const ids = rows.map((c) => c.id).join(",");
          const mRes = await fetch(
            `${supabaseUrl}/rest/v1/client_members?select=client_id,full_name,is_primary_contact&client_id=in.(${ids})&agent_id=eq.${user.id}&order=is_primary_contact.desc`,
            { headers }
          );
          if (mRes.ok) {
            const members: MemberSummary[] = await mRes.json();
            const map: Record<string, MemberSummary[]> = {};
            for (const m of members) {
              (map[m.client_id] = map[m.client_id] || []).push(m);
            }
            setMembersByClient(map);
          }
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">
              Clients
            </h1>
            <p className="mt-2 font-sans text-sm text-[#57534E]">
              Your household case files — prospects and signed clients in one place
            </p>
          </div>
          <button
            onClick={() => navigate("/clients/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-5 py-3 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31]"
          >
            <Plus size={16} />
            New Client
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-sans text-sm text-[#57534E]">Loading clients…</p>
          </div>
        ) : clients.length === 0 ? (
          /* Empty state — calm, on-brand */
          <div
            className="rounded-[20px] border border-white/60 px-8 py-20 text-center backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]"
            style={{
              background:
                "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 55%, rgba(246,241,234,0.68) 100%)",
              borderTop: "1px solid rgba(183,110,121,0.3)",
            }}
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B76E79]/12">
              <Contact size={22} className="text-[#8F4E58]" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              Your client book awaits
            </h2>
            <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-[#57534E]">
              Create your first household to begin tracking relationships, briefs, and
              buying progress — from first enquiry through to settlement.
            </p>
            <button
              onClick={() => navigate("/clients/new")}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-6 py-3 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31]"
            >
              <Plus size={16} />
              New Client
            </button>
          </div>
        ) : (
          /* Client list */
          <div
            className="overflow-hidden rounded-[20px] border border-white/60 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]"
            style={{
              background:
                "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
              borderTop: "1px solid rgba(183,110,121,0.3)",
            }}
          >
            {/* Column headings (desktop) */}
            <div className="hidden border-b border-[#1C1917]/[0.06] px-6 py-3 lg:grid lg:grid-cols-[2.2fr_1.6fr_1.4fr_1.1fr] lg:gap-4">
              {["Household", "Stages", "Next Action", "Last Contact"].map((h) => (
                <p key={h} className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534E]">
                  {h}
                </p>
              ))}
            </div>

            <ul className="divide-y divide-[#1C1917]/[0.06]">
              {clients.map((client) => {
                const members = membersByClient[client.id] || [];
                const attention = needsAttention(client);
                return (
                  <li key={client.id}>
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="grid w-full grid-cols-1 gap-3 px-6 py-5 text-left transition-colors duration-150 hover:bg-white/60 lg:grid-cols-[2.2fr_1.6fr_1.4fr_1.1fr] lg:items-center lg:gap-4"
                    >
                      {/* Household + members */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-sans text-[15px] font-semibold text-[#1C1917]">
                            {client.household_name}
                          </p>
                          {attention && (
                            <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#8F4E58]">
                              <AlertCircle size={13} strokeWidth={2} />
                              Needs attention
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-sans text-sm text-[#57534E]">
                          {members.length > 0
                            ? members.map((m) => m.full_name).join(", ")
                            : "No members recorded"}
                        </p>
                      </div>

                      {/* Stage badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <LifecycleBadge stage={client.lifecycle_stage} />
                        <BuyingBadge stage={client.buying_stage} />
                      </div>

                      {/* Next action */}
                      <div>
                        <p className="font-sans text-sm text-[#1C1917]">
                          {client.next_action_type || "—"}
                        </p>
                        <p className="font-sans text-xs tabular-nums text-[#57534E]">
                          {formatDate(client.next_action_date)}
                        </p>
                      </div>

                      {/* Last contact */}
                      <p className="font-sans text-sm tabular-nums text-[#57534E]">
                        {formatDate(client.last_contact_at)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
