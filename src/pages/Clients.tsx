/**
 * Clients.tsx — CRM Phase 1: the Clients workspace (list + board views).
 *
 * Design: quiet luxury (CLAUDE.md DESIGN VISION) — do NOT copy briefs styling.
 * Data access: raw fetch to Supabase REST only. Never import the supabase client.
 * Ownership: every query filters agent_id = logged-in user (owner-only RLS).
 * Plan: docs/CRM_ROADMAP.md (Phase 1).
 *
 * Board view: columns group by lifecycle stage ("By Relationship") OR buying
 * stage ("By Buying Stage") — never both at once (roadmap Phase 1). Cards use
 * native HTML5 drag-and-drop to move a household between stages; drops PATCH
 * the client, reset the matching entered-at timestamp, and log a timeline
 * activity — the same behaviour as the stage dialogs on ClientDetail.tsx.
 * Touch devices don't fire HTML5 drag events, so on mobile cards remain
 * tappable (open the record and change stage there).
 *
 * Saved views (Phase 4): built-in preset filter chips (All / Needs attention /
 * Prospects / Active clients / Closing\/closed / Settling) above the view
 * toggle. Client-side predicates only — no new tables, no writes. The active
 * view filters both list and board and persists across the toggle in
 * component state.
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Contact, AlertCircle, CalendarClock, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getStageAge } from "@/lib/stage-age";

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
  stage_entered_at: string | null;
  buying_stage_entered_at: string | null;
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

function restHeaders(json = false) {
  const { supabaseKey, accessToken } = getAuthHeaders();
  const h: Record<string, string> = {
    apikey: supabaseKey,
    Authorization: `Bearer ${accessToken}`,
  };
  if (json) {
    h["Content-Type"] = "application/json";
    h["Prefer"] = "return=representation";
  }
  return h;
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

/**
 * Saved views (Phase 4) — built-in preset filters over the loaded clients.
 * Pure client-side predicates: no new tables, no writes. "Needs attention"
 * reuses needsAttention() above so chip counts always match the row flags.
 */
type SavedViewKey =
  | "all"
  | "attention"
  | "stalling"
  | "prospects"
  | "active"
  | "closed"
  | "settling";

const PROSPECT_STAGES = ["new_enquiry", "discovery_booked", "discovery_completed"];

const SAVED_VIEWS: {
  key: SavedViewKey;
  label: string;
  matches: (c: ClientRow) => boolean;
  emptyCopy: string;
}[] = [
  { key: "all", label: "All", matches: () => true, emptyCopy: "" },
  {
    key: "attention",
    label: "Needs attention",
    matches: needsAttention,
    emptyCopy: "Nothing needs attention right now",
  },
  {
    key: "stalling",
    label: "Stalling",
    matches: (c) => getStageAge(c).stalling,
    emptyCopy: "Nothing is stalling — every household is moving",
  },
  {
    key: "prospects",
    label: "Prospects",
    matches: (c) => PROSPECT_STAGES.includes(c.lifecycle_stage),
    emptyCopy: "No prospects in the book just now",
  },
  {
    key: "active",
    label: "Active clients",
    matches: (c) => c.lifecycle_stage === "engaged",
    emptyCopy: "No engaged clients at the moment",
  },
  {
    key: "closed",
    label: "Closing/closed",
    matches: (c) =>
      c.lifecycle_stage === "closed_won" || c.lifecycle_stage === "closed_lost",
    emptyCopy: "No closed households yet",
  },
  {
    key: "settling",
    label: "Settling",
    matches: (c) =>
      c.buying_stage === "under_contract" || c.buying_stage === "settlement_support",
    emptyCopy: "No households approaching settlement right now",
  },
];

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

/**
 * Gentle stage-age indicator (Phase 4) — a calm champagne chip shown only
 * when a household is past its stage threshold. Fine clients render nothing.
 */
function StallingChip({ client }: { client: ClientRow }) {
  const age = getStageAge(client);
  if (!age.stalling || age.days === null) return null;
  const label =
    age.layer === "buying"
      ? BUYING_LABELS[age.stage] || age.stage
      : LIFECYCLE_LABELS[age.stage] || age.stage;
  return (
    <span
      data-stalling={age.days}
      title={`In ${label} for ${age.days} days`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D8C3B8]/80 bg-[#D8C3B8]/30 px-2 py-0.5 font-sans text-xs font-medium text-[#8F4E58]"
    >
      <Hourglass size={10} strokeWidth={2} />
      <span className="tabular-nums">{age.days} days</span>
    </span>
  );
}

/** Quiet-luxury segmented control (view + board-mode toggles). */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  idPrefix,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  idPrefix: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-[#1C1917]/12 bg-white/70 p-1 backdrop-blur-sm">
      {options.map((o) => (
        <button
          key={o.value}
          id={`${idPrefix}-${o.value}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={
            value === o.value
              ? "rounded-lg bg-[#2D6350] px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-[0_4px_10px_-2px_rgba(23,58,49,0.4)]"
              : "rounded-lg px-4 py-1.5 font-sans text-xs font-medium text-[#57534E] transition-colors hover:text-[#1C1917]"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const panelStyle = {
  background:
    "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
  borderTop: "1px solid rgba(183,110,121,0.3)",
};
const panelClass =
  "rounded-[20px] border border-white/60 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]";

type ViewKey = "list" | "board";
type BoardMode = "lifecycle" | "buying";

export default function Clients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [membersByClient, setMembersByClient] = useState<Record<string, MemberSummary[]>>({});
  const [loading, setLoading] = useState(true);

  // View preference lives in component state for the session (no localStorage).
  const [view, setView] = useState<ViewKey>("list");
  const [boardMode, setBoardMode] = useState<BoardMode>("lifecycle");
  // Saved-view filter — persists across the list/board toggle (same component).
  const [savedView, setSavedView] = useState<SavedViewKey>("all");

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragHappened = useRef(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const headers = restHeaders();
        const res = await fetch(
          `${supabaseUrl}/rest/v1/clients?select=id,household_name,household_type,lifecycle_stage,buying_stage,client_status,next_action_type,next_action_date,last_contact_at,stage_entered_at,buying_stage_entered_at,created_at&agent_id=eq.${user.id}&order=updated_at.desc`,
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
  }, [user, supabaseUrl]);

  /* ---------------------------------------------------- saved views */

  // Counts are computed over ALL loaded clients so every chip shows its
  // matching total regardless of which view is active.
  const savedViewCounts = useMemo(() => {
    const counts = {} as Record<SavedViewKey, number>;
    for (const v of SAVED_VIEWS) counts[v.key] = clients.filter(v.matches).length;
    return counts;
  }, [clients]);

  const activeSavedView =
    SAVED_VIEWS.find((v) => v.key === savedView) ?? SAVED_VIEWS[0];

  const filteredClients = useMemo(
    () => clients.filter(activeSavedView.matches),
    [clients, activeSavedView]
  );

  /* -------------------------------------------------- board structure */

  const boardColumns = useMemo<{ token: string; label: string }[]>(
    () =>
      boardMode === "lifecycle"
        ? Object.entries(LIFECYCLE_LABELS).map(([token, label]) => ({ token, label }))
        : [
            { token: "", label: "Not Started" },
            ...Object.entries(BUYING_LABELS).map(([token, label]) => ({ token, label })),
          ],
    [boardMode]
  );

  // Board columns are built from the saved-view-filtered set: the active chip
  // reduces which cards appear in each column, never the columns themselves.
  const clientsByColumn = useMemo(() => {
    const map: Record<string, ClientRow[]> = {};
    for (const col of boardColumns) map[col.token] = [];
    for (const c of filteredClients) {
      const token = boardMode === "lifecycle" ? c.lifecycle_stage : c.buying_stage || "";
      (map[token] = map[token] || []).push(c);
    }
    return map;
  }, [filteredClients, boardColumns, boardMode]);

  /* ------------------------------------------------- stage move (DnD) */

  const moveClient = async (clientId: string, targetToken: string) => {
    if (!user) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const isLifecycle = boardMode === "lifecycle";
    const from = isLifecycle ? client.lifecycle_stage : client.buying_stage;
    const to = isLifecycle ? targetToken : targetToken || null;
    if (to === from) return;

    // Optimistic move; keep a snapshot to roll back on failure.
    const snapshot = clients;
    setClients((cs) =>
      cs.map((c) =>
        c.id === clientId
          ? { ...c, [isLifecycle ? "lifecycle_stage" : "buying_stage"]: to }
          : c
      )
    );

    try {
      const now = new Date().toISOString();
      // Reset the matching entered-at timestamp so "days in stage" stays accurate
      // (same behaviour as the stage dialogs on ClientDetail.tsx).
      const patch = isLifecycle
        ? { lifecycle_stage: to, stage_entered_at: now }
        : { buying_stage: to, buying_stage_entered_at: to ? now : null };
      const res = await fetch(
        `${supabaseUrl}/rest/v1/clients?id=eq.${clientId}&agent_id=eq.${user.id}`,
        { method: "PATCH", headers: restHeaders(true), body: JSON.stringify(patch) }
      );
      if (!res.ok) throw new Error(await res.text());

      await fetch(`${supabaseUrl}/rest/v1/client_activities`, {
        method: "POST",
        headers: restHeaders(true),
        body: JSON.stringify({
          client_id: clientId,
          agent_id: user.id,
          actor_user_id: user.id,
          event_type: isLifecycle ? "lifecycle_stage_changed" : "buying_stage_changed",
          event_context: { from, to },
        }),
      }).catch((e) => console.error("Timeline write failed:", e));

      const label = isLifecycle
        ? LIFECYCLE_LABELS[to as string]
        : to
        ? BUYING_LABELS[to]
        : "Not Started";
      toast.success(`${client.household_name} moved to ${label}`);
    } catch (e) {
      console.error("Stage move failed:", e);
      setClients(snapshot);
      toast.error("Could not move the household — change rolled back.");
    }
  };

  /* --------------------------------------------------------- render */

  const renderCard = (client: ClientRow) => {
    const members = membersByClient[client.id] || [];
    const attention = needsAttention(client);
    const otherBadge =
      boardMode === "lifecycle" ? (
        <BuyingBadge stage={client.buying_stage} />
      ) : (
        <LifecycleBadge stage={client.lifecycle_stage} />
      );
    return (
      <div
        key={client.id}
        data-board-card={client.id}
        draggable
        onDragStart={(e) => {
          dragHappened.current = true;
          setDragId(client.id);
          e.dataTransfer.setData("text/plain", client.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragId(null);
          setDragOverCol(null);
          setTimeout(() => (dragHappened.current = false), 100);
        }}
        onClick={() => {
          if (dragHappened.current) return;
          navigate(`/clients/${client.id}`);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(`/clients/${client.id}`);
        }}
        aria-label={`Open ${client.household_name}`}
        className={`cursor-grab rounded-xl border bg-white/85 p-4 shadow-[0_2px_4px_rgba(94,70,55,0.06),0_10px_24px_-10px_rgba(140,95,70,0.25)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(94,70,55,0.08),0_16px_32px_-10px_rgba(183,110,121,0.3)] active:cursor-grabbing ${
          dragId === client.id
            ? "border-[#B76E79]/50 opacity-50 ring-2 ring-[#B76E79]/30"
            : "border-white/70"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-lg font-semibold leading-snug text-[#1C1917]">
            {client.household_name}
          </p>
          {attention && (
            <span
              title="Needs attention — no upcoming next action"
              className="mt-0.5 shrink-0 text-[#8F4E58]"
            >
              <AlertCircle size={14} strokeWidth={2.25} />
            </span>
          )}
        </div>
        <p className="mt-0.5 font-sans text-xs text-[#57534E]">
          {members.length > 0
            ? members.map((m) => m.full_name).join(", ")
            : "No members recorded"}
        </p>
        <div className="mt-3 flex items-center gap-1.5 font-sans text-xs text-[#57534E]">
          <CalendarClock size={12} strokeWidth={2} className="shrink-0 text-[#8F4E58]" />
          <span className="truncate">
            {client.next_action_type || "No next action"}
            {client.next_action_date ? (
              <span className="tabular-nums"> · {formatDate(client.next_action_date)}</span>
            ) : null}
          </span>
        </div>
        {(otherBadge || getStageAge(client).stalling) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {otherBadge}
            <StallingChip client={client} />
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        {/* Saved views — preset filter chips (apply to both list and board) */}
        {clients.length > 0 && !loading && (
          <div
            role="group"
            aria-label="Saved views"
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            {SAVED_VIEWS.map((v) => {
              const active = savedView === v.key;
              return (
                <button
                  key={v.key}
                  id={`saved-view-${v.key}`}
                  onClick={() => setSavedView(v.key)}
                  aria-pressed={active}
                  className={
                    active
                      ? "inline-flex items-center gap-2 rounded-full bg-[#2D6350] px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-[0_6px_14px_-4px_rgba(23,58,49,0.45)]"
                      : "inline-flex items-center gap-2 rounded-full border border-[#1C1917]/12 bg-white/70 px-4 py-1.5 font-sans text-xs font-medium text-[#57534E] backdrop-blur-sm transition-colors duration-150 hover:border-[#2D6350]/35 hover:text-[#1C1917]"
                  }
                >
                  {v.label}
                  <span
                    className={
                      active
                        ? "rounded-full bg-white/[0.18] px-2 py-px font-sans text-xs font-semibold tabular-nums text-white"
                        : "font-sans text-xs font-semibold tabular-nums text-[#8F4E58]"
                    }
                  >
                    {savedViewCounts[v.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* View controls */}
        {clients.length > 0 && !loading && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Segmented<ViewKey>
              value={view}
              onChange={setView}
              idPrefix="view"
              options={[
                { value: "list", label: "List" },
                { value: "board", label: "Board" },
              ]}
            />
            {view === "board" && (
              <Segmented<BoardMode>
                value={boardMode}
                onChange={setBoardMode}
                idPrefix="board-mode"
                options={[
                  { value: "lifecycle", label: "By Relationship" },
                  { value: "buying", label: "By Buying Stage" },
                ]}
              />
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-sans text-sm text-[#57534E]">Loading clients…</p>
          </div>
        ) : clients.length === 0 ? (
          /* Empty state — calm, on-brand */
          <div className={`${panelClass} px-8 py-20 text-center`} style={panelStyle}>
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
        ) : filteredClients.length === 0 ? (
          /* Calm per-view empty state — the book has clients, this view has none */
          <div className={`${panelClass} px-8 py-16 text-center`} style={panelStyle}>
            <p aria-hidden="true" className="font-serif text-2xl text-[#B76E79]">
              ✦
            </p>
            <p className="mt-3 font-serif text-xl font-semibold text-[#1C1917]">
              {activeSavedView.emptyCopy}
            </p>
            <button
              onClick={() => setSavedView("all")}
              className="mt-6 rounded-full border border-[#2D6350]/30 bg-white/70 px-5 py-2 font-sans text-xs font-semibold text-[#2D6350] transition-colors duration-150 hover:border-[#2D6350]/50 hover:bg-[#2D6350]/[0.06]"
            >
              View all clients
            </button>
          </div>
        ) : view === "board" ? (
          /* ------------------------------------------------ Board view */
          <div className="-mx-1 overflow-x-auto px-1 pb-8">
            <div className="flex items-start gap-4">
              {boardColumns.map((col) => {
                const colClients = clientsByColumn[col.token] || [];
                const isOver = dragOverCol === col.token && dragId !== null;
                return (
                  <div
                    key={col.token || "none"}
                    data-board-col={col.token || "none"}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverCol(col.token);
                    }}
                    onDragLeave={() =>
                      setDragOverCol((cur) => (cur === col.token ? null : cur))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain") || dragId;
                      setDragOverCol(null);
                      setDragId(null);
                      if (id) moveClient(id, col.token);
                    }}
                    className={`w-[272px] shrink-0 rounded-2xl border p-3 transition-colors duration-150 ${
                      isOver
                        ? "border-[#2D6350]/45 bg-[#2D6350]/[0.05]"
                        : "border-white/60 bg-white/40"
                    }`}
                    style={{ borderTopColor: isOver ? undefined : "rgba(183,110,121,0.3)" }}
                  >
                    <div className="mb-3 flex items-baseline justify-between px-1">
                      <p className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#2D6350]">
                        {col.label}
                      </p>
                      <p className="font-sans text-xs font-medium tabular-nums text-[#57534E]">
                        {colClients.length}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {colClients.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#1C1917]/12 px-3 py-8 text-center">
                          <p className="font-sans text-xs text-[#57534E]">
                            No households here
                          </p>
                        </div>
                      ) : (
                        colClients.map(renderCard)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ------------------------------------------------- List view */
          <div className={`${panelClass} overflow-hidden`} style={panelStyle}>
            {/* Column headings (desktop) */}
            <div className="hidden border-b border-[#1C1917]/[0.06] px-6 py-3 lg:grid lg:grid-cols-[2.2fr_1.6fr_1.4fr_1.1fr] lg:gap-4">
              {["Household", "Stages", "Next Action", "Last Contact"].map((h) => (
                <p key={h} className="font-sans text-xs uppercase tracking-[0.18em] text-[#57534E]">
                  {h}
                </p>
              ))}
            </div>

            <ul className="divide-y divide-[#1C1917]/[0.06]">
              {filteredClients.map((client) => {
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
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-sans text-[0.9375rem] font-semibold text-[#1C1917]">
                            {client.household_name}
                          </p>
                          {attention && (
                            <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#8F4E58]">
                              <AlertCircle size={13} strokeWidth={2} />
                              Needs attention
                            </span>
                          )}
                          <StallingChip client={client} />
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
