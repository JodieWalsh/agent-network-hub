/**
 * ClientDetail.tsx — CRM Phase 1: the household case file (client record).
 *
 * Top summary panel + tabs: Overview, Members, Tasks, Timeline
 * (Brief / Properties / Inspections are elegant "coming soon" placeholders
 * for Phases 2–3).
 *
 * Design: quiet luxury (CLAUDE.md) — never copy briefs styling.
 * Data access: raw fetch only; never import the supabase client.
 * Ownership: every query filters agent_id = logged-in user.
 * Dialogs: custom frosted modals — never window.confirm().
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Star,
  Check,
  ChevronDown,
  Clock,
  CalendarClock,
  Pencil,
  StickyNote,
  ClipboardList,
  History,
  UserRound,
  FileText,
  Building2,
  ClipboardCheck,
  AlertCircle,
  Link2,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

/* ---------------------------------------------------------------- types */

interface Client {
  id: string;
  household_name: string;
  household_type: string | null;
  lifecycle_stage: string;
  buying_stage: string | null;
  client_status: string;
  lead_source: string | null;
  urgency_level: string | null;
  next_action_date: string | null;
  next_action_type: string | null;
  last_contact_at: string | null;
  shared_budget_min: number | null;
  shared_budget_max: number | null;
  target_locations_summary: string | null;
  primary_contact_member_id: string | null;
  stage_entered_at: string | null;
  buying_stage_entered_at: string | null;
  created_at: string;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_in_household: string | null;
  is_primary_contact: boolean;
  is_decision_maker: boolean;
  is_financial_decision_maker: boolean;
}

interface Task {
  id: string;
  client_member_id: string | null;
  title: string;
  description: string | null;
  task_type: string | null;
  status: string;
  priority: string | null;
  due_at: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
}

interface Activity {
  id: string;
  actor_user_id: string | null;
  event_type: string;
  event_context: Record<string, unknown> | null;
  created_at: string;
}

/**
 * The subset of client_briefs columns the CRM reads (READ + link/unlink of
 * client_id ONLY — no other brief field is ever written from the CRM).
 * Column list verified against the live DB 4 Jul 2026; types.ts is stale.
 */
interface BriefSummary {
  id: string;
  brief_name: string | null;
  client_name: string | null;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  bathrooms_max: number | null;
  preferred_suburbs: string[] | null;
  location_summary: string | null;
  property_types: string[] | null;
  must_have_features: string[] | null;
  updated_at: string;
}

const BRIEF_COLS =
  "id,brief_name,client_name,status,budget_min,budget_max,bedrooms_min,bedrooms_max,bathrooms_min,bathrooms_max,preferred_suburbs,location_summary,property_types,must_have_features,updated_at";

/**
 * CRM Phase 3 (inspections): READ-ONLY over inspection_jobs/_reports.
 * The chain is household → linked brief (client_briefs.client_id) →
 * inspection_jobs.client_brief_id. No schema change, no writes — posting
 * and managing inspections stays in the existing marketplace flow.
 */
interface InspectionJob {
  id: string;
  title: string | null;
  property_address: string | null;
  status: string;
  budget_amount: number | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string | null;
  agreed_price: number | null;
  assigned_inspector_id: string | null;
  created_at: string;
}

const JOB_COLS =
  "id,title,property_address,status,budget_amount,budget_min,budget_max,budget_currency,agreed_price,assigned_inspector_id,created_at";

const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open",
  assigned: "Assigned",
  pending_inspector_setup: "Awaiting Setup",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/**
 * CRM Phase 3 (properties): the household's property pipeline.
 * READS the marketplace properties table (never writes it); WRITES only
 * client_properties (owner-only RLS on agent_id). Property columns verified
 * against the live DB 4 Jul 2026 — types.ts is stale.
 */
interface PropertyInfo {
  id: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  full_address: string | null;
  property_address: string | null;
  street_address: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
}

interface LinkedProperty {
  id: string;
  property_id: string;
  status: string;
  status_entered_at: string | null;
  notes: string | null;
  property: PropertyInfo | null;
}

const PROP_COLS =
  "id,title,price,currency,full_address,property_address,street_address,suburb,city,state,bedrooms,bathrooms,parking_spaces";

/** Pipeline order matters: candidate → … → purchased, with passed parked. */
const CP_STATUSES = ["candidate", "shortlisted", "due_diligence", "offered", "purchased", "passed"] as const;

const CP_STATUS_LABELS: Record<string, string> = {
  candidate: "Candidate",
  shortlisted: "Shortlisted",
  due_diligence: "Due Diligence",
  offered: "Offered",
  purchased: "Purchased",
  passed: "Passed",
};

/* ------------------------------------------------------------- constants */

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

const ROLE_LABELS: Record<string, string> = {
  spouse: "Spouse",
  partner: "Partner",
  parent: "Parent",
  child: "Child",
  co_buyer: "Co-buyer",
  other: "Member",
};

const HOUSEHOLD_TYPE_LABELS: Record<string, string> = {
  couple: "Couple",
  family: "Family",
  parent_child: "Parent & Child",
  co_buyers: "Co-buyers",
  single: "Single Buyer",
  other: "Household",
};

const TASK_TYPES = [
  "call", "email", "meeting", "follow_up", "finance_check", "brief_update",
  "inspection", "due_diligence", "offer", "contract", "settlement",
  "document_chase", "internal_reminder",
];

const EVENT_LABELS: Record<string, string> = {
  client_created: "Client created",
  member_added: "Member added",
  member_updated: "Member updated",
  note_added: "Note added",
  task_created: "Task created",
  task_completed: "Task completed",
  lifecycle_stage_changed: "Lifecycle stage changed",
  buying_stage_changed: "Buying stage changed",
  brief_linked: "Brief linked",
  brief_unlinked: "Brief unlinked",
  property_linked: "Property linked",
  property_status_changed: "Property status changed",
  property_unlinked: "Property unlinked",
};

const BRIEF_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  matched: "Matched",
  on_hold: "On Hold",
  archived: "Archived",
};

/* --------------------------------------------------------------- helpers */

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

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function daysSince(value: string | null): number | null {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

/** Human label for a stage token; null/undefined reads as "Not started". */
function stageLabel(map: Record<string, string>, token: unknown): string {
  if (!token) return "Not started";
  return map[token as string] || String(token);
}

function fmtMoney(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString("en-AU")}`;
}

function briefBudget(b: BriefSummary): string {
  if (!b.budget_min && !b.budget_max) return "Budget not set";
  return `${fmtMoney(b.budget_min)} – ${fmtMoney(b.budget_max)}`;
}

function briefLocation(b: BriefSummary): string {
  if (b.location_summary) return b.location_summary;
  if (b.preferred_suburbs && b.preferred_suburbs.length > 0)
    return b.preferred_suburbs.slice(0, 3).join(", ") + (b.preferred_suburbs.length > 3 ? "…" : "");
  return "No locations recorded";
}

function rangeLabel(min: number | null, max: number | null): string {
  if (!min && !max) return "Any";
  if (min && max) return min === max ? `${min}` : `${min}–${max}`;
  return min ? `${min}+` : `up to ${max}`;
}

function jobBudget(j: InspectionJob): string {
  const settled = j.agreed_price ?? j.budget_amount;
  const base = settled
    ? fmtMoney(settled)
    : j.budget_min || j.budget_max
    ? `${fmtMoney(j.budget_min)} – ${fmtMoney(j.budget_max)}`
    : "—";
  return j.budget_currency && j.budget_currency !== "AUD" ? `${base} ${j.budget_currency}` : base;
}

/** Live rows vary: newer listings use street_address + city, older ones
 *  full_address / property_address / suburb — fall through them all. */
function propAddress(p: PropertyInfo | null): string {
  if (!p) return "Property unavailable";
  return (
    p.full_address ||
    p.property_address ||
    [p.street_address, p.suburb || p.city, p.state].filter(Boolean).join(", ") ||
    "Address not recorded"
  );
}

function propPrice(p: PropertyInfo | null): string {
  if (!p || p.price === null || p.price === undefined) return "—";
  const base = `$${p.price.toLocaleString("en-AU")}`;
  return p.currency && p.currency !== "AUD" ? `${base} ${p.currency}` : base;
}

function propSpecs(p: PropertyInfo | null): string {
  if (!p) return "";
  const parts: string[] = [];
  if (p.bedrooms !== null && p.bedrooms !== undefined) parts.push(`${p.bedrooms} bed`);
  if (p.bathrooms !== null && p.bathrooms !== undefined) parts.push(`${p.bathrooms} bath`);
  if (p.parking_spaces !== null && p.parking_spaces !== undefined) parts.push(`${p.parking_spaces} car`);
  return parts.join(" · ");
}

/** Pipeline badge — clickable to change status (same affordance as stage badges). */
function CpStatusBadge({ status, onChange, rowKey }: { status: string; onChange?: () => void; rowKey?: string }) {
  const tone =
    status === "purchased"
      ? "border-[#2D6350]/25 bg-[#2D6350]/[0.08] text-[#2D6350]"
      : status === "offered" || status === "due_diligence"
      ? "border-[#B76E79]/30 bg-[#B76E79]/[0.09] text-[#8F4E58]"
      : status === "passed"
      ? "border-[#1C1917]/12 bg-white/60 text-[#57534E]"
      : "border-[#1C1917]/15 bg-[#D8C3B8]/25 text-[#57534E]"; // candidate / shortlisted
  const inner = CP_STATUS_LABELS[status] || status;
  if (!onChange) {
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-xs font-medium ${tone}`}>
        {inner}
      </span>
    );
  }
  return (
    <button
      data-cp-status-btn={rowKey}
      onClick={onChange}
      aria-label={`Change property status (currently ${inner})`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-xs font-medium transition-colors hover:border-[#2D6350]/45 ${tone}`}
    >
      {inner}
      <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
    </button>
  );
}

/** Muted, elegant inspection-status badge in the quiet-luxury palette. */
function JobStatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "border-[#2D6350]/25 bg-[#2D6350]/[0.08] text-[#2D6350]"
      : ["assigned", "in_progress", "pending_review", "pending_inspector_setup"].includes(status)
      ? "border-[#B76E79]/30 bg-[#B76E79]/[0.09] text-[#8F4E58]"
      : status === "open"
      ? "border-[#1C1917]/15 bg-[#D8C3B8]/25 text-[#57534E]"
      : "border-[#1C1917]/12 bg-white/60 text-[#57534E]";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-xs font-medium ${tone}`}>
      {JOB_STATUS_LABELS[status] || status}
    </span>
  );
}

/** Muted, elegant brief-status badge — quiet luxury, never traffic-light chips. */
function BriefStatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "border-[#2D6350]/25 bg-[#2D6350]/[0.08] text-[#2D6350]"
      : status === "matched"
      ? "border-[#B76E79]/30 bg-[#B76E79]/[0.09] text-[#8F4E58]"
      : "border-[#1C1917]/15 bg-[#D8C3B8]/25 text-[#57534E]";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-xs font-medium ${tone}`}>
      {BRIEF_STATUS_LABELS[status] || status}
    </span>
  );
}

/* ------------------------------------------------------- shared visuals */

const panelStyle = {
  background:
    "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
  borderTop: "1px solid rgba(183,110,121,0.3)",
};
const panelClass =
  "rounded-[20px] border border-white/60 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]";
const inputClass =
  "w-full rounded-xl border border-[#1C1917]/15 bg-white/90 px-4 py-2.5 font-sans text-sm text-[#1C1917] placeholder:text-[#8A8580] outline-none transition-colors focus:border-[#2D6350] focus:ring-2 focus:ring-[#2D6350]/15";
const labelClass =
  "mb-1.5 block font-sans text-xs font-medium uppercase tracking-[0.14em] text-[#57534E]";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31] disabled:translate-y-0 disabled:opacity-60";
const subtleBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#2D6350]/25 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#2D6350] transition-colors hover:bg-[#2D6350]/[0.06]";

function LifecycleBadge({ stage, onChange }: { stage: string; onChange?: () => void }) {
  const inner = LIFECYCLE_LABELS[stage] || stage;
  if (!onChange) {
    return (
      <span className="inline-flex items-center rounded-full border border-[#2D6350]/25 bg-[#2D6350]/[0.08] px-3 py-1 font-sans text-xs font-medium text-[#2D6350]">
        {inner}
      </span>
    );
  }
  return (
    <button
      id="stage-badge-lifecycle"
      onClick={onChange}
      aria-label={`Change lifecycle stage (currently ${inner})`}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#2D6350]/25 bg-[#2D6350]/[0.08] px-3 py-1 font-sans text-xs font-medium text-[#2D6350] transition-colors hover:border-[#2D6350]/45 hover:bg-[#2D6350]/[0.14]"
    >
      {inner}
      <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
    </button>
  );
}

function BuyingBadge({ stage, onChange }: { stage: string | null; onChange?: () => void }) {
  if (!stage && !onChange) return null;
  if (!onChange) {
    return (
      <span className="inline-flex items-center rounded-md border border-[#B76E79]/30 bg-[#B76E79]/[0.09] px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58]">
        {BUYING_LABELS[stage!] || stage}
      </span>
    );
  }
  if (!stage) {
    return (
      <button
        id="stage-badge-buying"
        onClick={onChange}
        aria-label="Set buying stage (not started)"
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#8F4E58]/40 bg-white/50 px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58] transition-colors hover:border-[#8F4E58]/70 hover:bg-[#B76E79]/[0.09]"
      >
        Set buying stage
        <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
      </button>
    );
  }
  const inner = BUYING_LABELS[stage] || stage;
  return (
    <button
      id="stage-badge-buying"
      onClick={onChange}
      aria-label={`Change buying stage (currently ${inner})`}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#B76E79]/30 bg-[#B76E79]/[0.09] px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58] transition-colors hover:border-[#B76E79]/55 hover:bg-[#B76E79]/[0.16]"
    >
      {inner}
      <ChevronDown size={12} strokeWidth={2.25} className="opacity-70" />
    </button>
  );
}

/** Frosted quiet-luxury modal — the project's elegant alternative to window.confirm. */
function Modal({
  title, open, onClose, children,
}: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#173A31]/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`${panelClass} relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6`}
        style={{ ...panelStyle, background: "linear-gradient(150deg, #FFFFFF 0%, #FBF8F3 60%, #F6F1EA 100%)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-xl font-semibold text-[#1C1917]">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-[#57534E] transition-colors hover:bg-[#1C1917]/[0.06]">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ component */

type TabKey = "overview" | "members" | "tasks" | "brief" | "properties" | "inspections" | "timeline";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [brief, setBrief] = useState<BriefSummary | null>(null);
  const [jobs, setJobs] = useState<InspectionJob[]>([]);
  const [reportJobIds, setReportJobIds] = useState<Set<string>>(new Set());
  const [inspectorNames, setInspectorNames] = useState<Record<string, string>>({});
  const [linkedProps, setLinkedProps] = useState<LinkedProperty[]>([]);
  const [showPassed, setShowPassed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");

  // dialogs
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState({
    title: "", description: "", task_type: "follow_up", priority: "medium", due_at: "", client_member_id: "",
  });
  const [memberOpen, setMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberDraft, setMemberDraft] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    role_in_household: "other", is_primary_contact: false, is_decision_maker: false,
  });
  const [stageDialog, setStageDialog] = useState<null | "lifecycle" | "buying">(null);
  const [stageChoice, setStageChoice] = useState("");
  const [snoozeTask, setSnoozeTask] = useState<Task | null>(null);
  const [snoozeDate, setSnoozeDate] = useState("");
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkableBriefs, setLinkableBriefs] = useState<BriefSummary[]>([]);
  const [linkableLoading, setLinkableLoading] = useState(false);
  const [briefChoice, setBriefChoice] = useState("");
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [propQuery, setPropQuery] = useState("");
  const [propResults, setPropResults] = useState<PropertyInfo[]>([]);
  const [propSearched, setPropSearched] = useState(false);
  const [propSearching, setPropSearching] = useState(false);
  const [propChoice, setPropChoice] = useState<PropertyInfo | null>(null);
  const [propNote, setPropNote] = useState("");
  const [statusDialogFor, setStatusDialogFor] = useState<LinkedProperty | null>(null);
  const [cpStatusChoice, setCpStatusChoice] = useState("");
  const [unlinkPropFor, setUnlinkPropFor] = useState<LinkedProperty | null>(null);
  const [busy, setBusy] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const loadAll = useCallback(async () => {
    if (!user || !id) return;
    try {
      const headers = restHeaders();
      const [cRes, mRes, tRes, aRes, bRes, cpRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${id}&agent_id=eq.${user.id}&select=*`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/client_members?client_id=eq.${id}&agent_id=eq.${user.id}&select=*&order=is_primary_contact.desc,created_at.asc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/client_tasks?client_id=eq.${id}&agent_id=eq.${user.id}&select=*&order=status.asc,due_at.asc.nullslast`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/client_activities?client_id=eq.${id}&agent_id=eq.${user.id}&select=*&order=created_at.desc&limit=100`, { headers }),
        // The household's linked brief, if any (READ-only over client_briefs)
        fetch(`${supabaseUrl}/rest/v1/client_briefs?client_id=eq.${id}&agent_id=eq.${user.id}&select=${BRIEF_COLS}&limit=1`, { headers }),
        // The household's property pipeline (embeds the marketplace property, read-only)
        fetch(`${supabaseUrl}/rest/v1/client_properties?client_id=eq.${id}&agent_id=eq.${user.id}&select=id,property_id,status,status_entered_at,notes,property:properties(${PROP_COLS})&order=created_at.asc`, { headers }),
      ]);
      const [c] = cRes.ok ? await cRes.json() : [];
      setClient(c || null);
      setMembers(mRes.ok ? await mRes.json() : []);
      setTasks(tRes.ok ? await tRes.json() : []);
      setActivities(aRes.ok ? await aRes.json() : []);
      const [b] = bRes.ok ? await bRes.json() : [];
      setBrief(b || null);
      setLinkedProps(cpRes.ok ? await cpRes.json() : []);

      // Inspections read-through (Phase 3): household → linked brief → jobs.
      // READ-ONLY — never writes to inspection tables.
      if (b) {
        const jRes = await fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?client_brief_id=eq.${b.id}&requesting_agent_id=eq.${user.id}&select=${JOB_COLS}&order=created_at.desc`,
          { headers }
        );
        const jobRows: InspectionJob[] = jRes.ok ? await jRes.json() : [];
        setJobs(jobRows);
        if (jobRows.length > 0) {
          const jobIds = jobRows.map((j) => j.id).join(",");
          const inspectorIds = [...new Set(jobRows.map((j) => j.assigned_inspector_id).filter(Boolean))];
          const [rRes, pRes] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/inspection_reports?job_id=in.(${jobIds})&select=job_id`, { headers }),
            inspectorIds.length > 0
              ? fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${inspectorIds.join(",")})&select=id,full_name`, { headers })
              : Promise.resolve(null),
          ]);
          const reports: { job_id: string }[] = rRes.ok ? await rRes.json() : [];
          setReportJobIds(new Set(reports.map((r) => r.job_id)));
          const profiles: { id: string; full_name: string }[] = pRes && pRes.ok ? await pRes.json() : [];
          setInspectorNames(Object.fromEntries(profiles.map((p) => [p.id, p.full_name])));
        } else {
          setReportJobIds(new Set());
          setInspectorNames({});
        }
      } else {
        setJobs([]);
        setReportJobIds(new Set());
        setInspectorNames({});
      }
    } catch (error) {
      console.error("Error loading client record:", error);
    } finally {
      setLoading(false);
    }
  }, [user, id, supabaseUrl]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const memberName = useCallback(
    (memberId: string | null) => members.find((m) => m.id === memberId)?.full_name || null,
    [members]
  );

  const openTasks = useMemo(() => tasks.filter((t) => t.status === "open"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status !== "open"), [tasks]);

  const attention = useMemo(() => {
    if (!client) return false;
    const closed = client.lifecycle_stage === "closed_won" || client.lifecycle_stage === "closed_lost" || client.client_status !== "active";
    if (closed) return false;
    if (!client.next_action_date) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(client.next_action_date + "T00:00:00") < today;
  }, [client]);

  /* --------------------------------------------------------- mutations */

  const writeActivity = async (event_type: string, event_context: Record<string, unknown>) => {
    if (!user || !id) return;
    await fetch(`${supabaseUrl}/rest/v1/client_activities`, {
      method: "POST",
      headers: restHeaders(true),
      body: JSON.stringify({ client_id: id, agent_id: user.id, actor_user_id: user.id, event_type, event_context }),
    }).catch((e) => console.error("Timeline write failed:", e));
  };

  const openStageDialog = (which: "lifecycle" | "buying") => {
    if (!client) return;
    setStageChoice(which === "lifecycle" ? client.lifecycle_stage : client.buying_stage || "");
    setStageDialog(which);
  };

  const saveStage = async () => {
    if (!user || !id || !client || !stageDialog) return;
    const isLifecycle = stageDialog === "lifecycle";
    const from = isLifecycle ? client.lifecycle_stage : client.buying_stage;
    const to = isLifecycle ? stageChoice : stageChoice || null;
    if (to === from) { setStageDialog(null); return; }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      // Reset the matching entered-at timestamp so "days in stage" stays accurate.
      const patch = isLifecycle
        ? { lifecycle_stage: to, stage_entered_at: now }
        : { buying_stage: to, buying_stage_entered_at: to ? now : null };
      const res = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${id}&agent_id=eq.${user.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeActivity(isLifecycle ? "lifecycle_stage_changed" : "buying_stage_changed", { from, to });
      toast.success(isLifecycle ? "Lifecycle stage updated" : "Buying stage updated");
      setStageDialog(null);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not update the stage.");
    } finally { setBusy(false); }
  };

  /* Brief linking (CRM Phase 2) — the ONLY write the CRM ever makes to
     client_briefs is setting/clearing client_id. All other brief data is
     read-only here; clients.household_name stays the display name in the
     CRM (source-of-truth rule, roadmap decision 3). */

  const openLinkDialog = async () => {
    if (!user) return;
    setBriefChoice("");
    setLinkOpen(true);
    setLinkableLoading(true);
    try {
      // Only this agent's briefs that aren't already linked to a household
      const res = await fetch(
        `${supabaseUrl}/rest/v1/client_briefs?agent_id=eq.${user.id}&client_id=is.null&select=${BRIEF_COLS}&order=updated_at.desc`,
        { headers: restHeaders() }
      );
      setLinkableBriefs(res.ok ? await res.json() : []);
    } catch (e) {
      console.error("Could not load briefs:", e);
      setLinkableBriefs([]);
    } finally {
      setLinkableLoading(false);
    }
  };

  const linkBrief = async () => {
    if (!user || !id || !briefChoice) return;
    const chosen = linkableBriefs.find((b) => b.id === briefChoice);
    setBusy(true);
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/client_briefs?id=eq.${briefChoice}&agent_id=eq.${user.id}`,
        { method: "PATCH", headers: restHeaders(true), body: JSON.stringify({ client_id: id }) }
      );
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("brief_linked", {
        brief_id: briefChoice,
        brief_name: chosen?.brief_name || chosen?.client_name || "Brief",
      });
      toast.success("Brief linked to this household");
      setLinkOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not link the brief.");
    } finally { setBusy(false); }
  };

  const unlinkBrief = async () => {
    if (!user || !brief) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/client_briefs?id=eq.${brief.id}&agent_id=eq.${user.id}`,
        { method: "PATCH", headers: restHeaders(true), body: JSON.stringify({ client_id: null }) }
      );
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("brief_unlinked", {
        brief_id: brief.id,
        brief_name: brief.brief_name || brief.client_name || "Brief",
      });
      toast.success("Brief unlinked");
      setUnlinkOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not unlink the brief.");
    } finally { setBusy(false); }
  };

  /* Property pipeline (CRM Phase 3) — READS properties (marketplace table,
     never written from the CRM); WRITES only client_properties rows owned
     by this agent. */

  const searchProperties = async () => {
    if (!user) return;
    // PostgREST or=() syntax breaks on commas/parens — strip them from the term
    const q = propQuery.trim().replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
    if (!q) { toast.error("Type an address, suburb, or title to search."); return; }
    setPropSearching(true);
    try {
      const enc = encodeURIComponent(`*${q}*`);
      const res = await fetch(
        `${supabaseUrl}/rest/v1/properties?select=${PROP_COLS}&or=(full_address.ilike.${enc},property_address.ilike.${enc},street_address.ilike.${enc},suburb.ilike.${enc},city.ilike.${enc},title.ilike.${enc})&order=created_at.desc&limit=8`,
        { headers: restHeaders() }
      );
      setPropResults(res.ok ? await res.json() : []);
      setPropSearched(true);
    } catch (e) {
      console.error("Property search failed:", e);
      setPropResults([]);
      setPropSearched(true);
    } finally {
      setPropSearching(false);
    }
  };

  const openAddProperty = () => {
    setPropQuery(""); setPropResults([]); setPropSearched(false);
    setPropChoice(null); setPropNote("");
    setAddPropOpen(true);
  };

  const linkProperty = async () => {
    if (!user || !id || !propChoice) return;
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_properties`, {
        method: "POST",
        headers: restHeaders(true),
        body: JSON.stringify({
          client_id: id,
          property_id: propChoice.id,
          agent_id: user.id,
          status: "candidate",
          notes: propNote.trim() || null,
        }),
      });
      if (res.status === 409) {
        toast.error("That property is already linked to this household.");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("property_linked", {
        property_id: propChoice.id,
        address: propAddress(propChoice),
      });
      toast.success("Property linked");
      setAddPropOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not link the property.");
    } finally { setBusy(false); }
  };

  const openCpStatusDialog = (lp: LinkedProperty) => {
    setCpStatusChoice(lp.status);
    setStatusDialogFor(lp);
  };

  const saveCpStatus = async () => {
    if (!user || !statusDialogFor || !cpStatusChoice) return;
    if (cpStatusChoice === statusDialogFor.status) { setStatusDialogFor(null); return; }
    setBusy(true);
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/client_properties?id=eq.${statusDialogFor.id}&agent_id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: restHeaders(true),
          body: JSON.stringify({ status: cpStatusChoice, status_entered_at: new Date().toISOString() }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("property_status_changed", {
        property_id: statusDialogFor.property_id,
        address: propAddress(statusDialogFor.property),
        from: statusDialogFor.status,
        to: cpStatusChoice,
      });
      toast.success("Property status updated");
      setStatusDialogFor(null);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not update the property status.");
    } finally { setBusy(false); }
  };

  const unlinkProperty = async () => {
    if (!user || !unlinkPropFor) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/client_properties?id=eq.${unlinkPropFor.id}&agent_id=eq.${user.id}`,
        { method: "DELETE", headers: restHeaders() }
      );
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("property_unlinked", {
        property_id: unlinkPropFor.property_id,
        address: propAddress(unlinkPropFor.property),
      });
      toast.success("Property unlinked");
      setUnlinkPropFor(null);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not unlink the property.");
    } finally { setBusy(false); }
  };

  const saveNote = async () => {
    if (!user || !id || !noteBody.trim()) { toast.error("Write a note first."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_notes`, {
        method: "POST",
        headers: restHeaders(true),
        body: JSON.stringify({ client_id: id, agent_id: user.id, body: noteBody.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("note_added", { excerpt: noteBody.trim().slice(0, 120) });
      toast.success("Note added");
      setNoteBody(""); setNoteOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not save the note.");
    } finally { setBusy(false); }
  };

  const saveTask = async () => {
    if (!user || !id || !taskDraft.title.trim()) { toast.error("Give the task a title."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_tasks`, {
        method: "POST",
        headers: restHeaders(true),
        body: JSON.stringify({
          client_id: id,
          agent_id: user.id,
          owner_user_id: user.id,
          created_by_user_id: user.id,
          client_member_id: taskDraft.client_member_id || null,
          title: taskDraft.title.trim(),
          description: taskDraft.description.trim() || null,
          task_type: taskDraft.task_type,
          priority: taskDraft.priority,
          due_at: taskDraft.due_at ? new Date(taskDraft.due_at).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("task_created", {
        title: taskDraft.title.trim(),
        shared: !taskDraft.client_member_id,
        member: memberName(taskDraft.client_member_id || null),
      });
      toast.success("Task created");
      setTaskDraft({ title: "", description: "", task_type: "follow_up", priority: "medium", due_at: "", client_member_id: "" });
      setTaskOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not create the task.");
    } finally { setBusy(false); }
  };

  const completeTask = async (task: Task) => {
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_tasks?id=eq.${task.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await writeActivity("task_completed", { title: task.title });
      toast.success("Task completed");
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not complete the task.");
    } finally { setBusy(false); }
  };

  const applySnooze = async () => {
    if (!snoozeTask || !snoozeDate) { toast.error("Pick a snooze date."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_tasks?id=eq.${snoozeTask.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({ snoozed_until: new Date(snoozeDate + "T09:00:00").toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Task snoozed");
      setSnoozeTask(null); setSnoozeDate("");
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not snooze the task.");
    } finally { setBusy(false); }
  };

  const applyReschedule = async () => {
    if (!rescheduleTask || !rescheduleDate) { toast.error("Pick a new due date."); return; }
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/client_tasks?id=eq.${rescheduleTask.id}`, {
        method: "PATCH",
        headers: restHeaders(true),
        body: JSON.stringify({ due_at: new Date(rescheduleDate).toISOString() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Task rescheduled");
      setRescheduleTask(null); setRescheduleDate("");
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not reschedule the task.");
    } finally { setBusy(false); }
  };

  const openMemberDialog = (member: Member | null) => {
    setEditingMember(member);
    setMemberDraft(member ? {
      first_name: member.first_name,
      last_name: member.last_name || "",
      email: member.email || "",
      phone: member.phone || "",
      role_in_household: member.role_in_household || "other",
      is_primary_contact: member.is_primary_contact,
      is_decision_maker: member.is_decision_maker,
    } : {
      first_name: "", last_name: "", email: "", phone: "",
      role_in_household: "other", is_primary_contact: false, is_decision_maker: false,
    });
    setMemberOpen(true);
  };

  const saveMember = async () => {
    if (!user || !id || !memberDraft.first_name.trim()) { toast.error("A first name is required."); return; }
    setBusy(true);
    try {
      const headers = restHeaders(true);
      // Exactly-one-primary rule: unset others first (DB partial unique index
      // makes duplicates impossible; ordering matters).
      if (memberDraft.is_primary_contact) {
        const unset = await fetch(`${supabaseUrl}/rest/v1/client_members?client_id=eq.${id}&is_primary_contact=eq.true`, {
          method: "PATCH", headers, body: JSON.stringify({ is_primary_contact: false }),
        });
        if (!unset.ok) throw new Error(await unset.text());
      }
      const payload = {
        first_name: memberDraft.first_name.trim(),
        last_name: memberDraft.last_name.trim() || null,
        full_name: `${memberDraft.first_name.trim()} ${memberDraft.last_name.trim()}`.trim(),
        email: memberDraft.email.trim() || null,
        phone: memberDraft.phone.trim() || null,
        role_in_household: memberDraft.role_in_household,
        is_primary_contact: memberDraft.is_primary_contact,
        is_decision_maker: memberDraft.is_decision_maker,
      };
      let savedId: string;
      if (editingMember) {
        const res = await fetch(`${supabaseUrl}/rest/v1/client_members?id=eq.${editingMember.id}`, {
          method: "PATCH", headers, body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        savedId = editingMember.id;
        await writeActivity("member_updated", { member: payload.full_name });
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/client_members`, {
          method: "POST", headers,
          body: JSON.stringify({ ...payload, client_id: id, agent_id: user.id }),
        });
        if (!res.ok) throw new Error(await res.text());
        const [row] = await res.json();
        savedId = row.id;
        await writeActivity("member_added", { member: payload.full_name });
      }
      // Keep the client's primary pointer in sync
      if (memberDraft.is_primary_contact) {
        await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${id}`, {
          method: "PATCH", headers, body: JSON.stringify({ primary_contact_member_id: savedId }),
        });
      }
      toast.success(editingMember ? "Member updated" : "Member added");
      setMemberOpen(false); setEditingMember(null);
      await loadAll();
    } catch (e) {
      console.error(e); toast.error("Could not save the member.");
    } finally { setBusy(false); }
  };

  /* --------------------------------------------------------------- UI */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <p className="font-sans text-sm text-[#57534E]">Loading client record…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl py-24 text-center">
          <h1 className="font-serif text-2xl font-semibold text-[#1C1917]">Client not found</h1>
          <p className="mt-2 font-sans text-sm text-[#57534E]">This household doesn't exist or belongs to another agent.</p>
          <button onClick={() => navigate("/clients")} className={`${primaryBtn} mt-6`}>
            <ArrowLeft size={15} /> Back to Clients
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const lifecycleDays = daysSince(client.stage_entered_at);
  const buyingDays = daysSince(client.buying_stage_entered_at);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: UserRound },
    { key: "members", label: "Members", icon: UserRound },
    { key: "tasks", label: "Tasks", icon: ClipboardList },
    { key: "brief", label: "Brief", icon: FileText },
    { key: "properties", label: "Properties", icon: Building2 },
    { key: "inspections", label: "Inspections", icon: ClipboardCheck },
    { key: "timeline", label: "Timeline", icon: History },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/clients")}
          className="mb-6 inline-flex items-center gap-2 font-sans text-sm font-medium text-[#2D6350] transition-colors hover:text-[#173A31]"
        >
          <ArrowLeft size={15} /> Back to Clients
        </button>

        {/* ------------------------------------------- Top summary panel */}
        <div className={`${panelClass} p-6 lg:p-8`} style={panelStyle}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">
                  {client.household_name}
                </h1>
                {attention && (
                  <span className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#8F4E58]">
                    <AlertCircle size={13} strokeWidth={2} /> Needs attention
                  </span>
                )}
              </div>
              <p className="mt-1 font-sans text-sm text-[#57534E]">
                {HOUSEHOLD_TYPE_LABELS[client.household_type || "other"]}
                {client.lead_source ? ` · via ${client.lead_source}` : ""}
              </p>

              {/* Member chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#1C1917]/12 bg-white/80 px-3 py-1 font-sans text-xs font-medium text-[#1C1917]"
                  >
                    {m.full_name}
                    {m.is_primary_contact && (
                      <span className="inline-flex items-center gap-0.5 text-[#8F4E58]">
                        <Star size={10} fill="currentColor" /> Primary
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* Stage badges — click to change */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <LifecycleBadge stage={client.lifecycle_stage} onChange={() => openStageDialog("lifecycle")} />
                <BuyingBadge stage={client.buying_stage} onChange={() => openStageDialog("buying")} />
              </div>
            </div>

            {/* Next action + last contact */}
            <div className="shrink-0 rounded-2xl border border-[#1C1917]/[0.08] bg-white/70 p-4 lg:w-64">
              <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534E]">Next Action</p>
              <p className="mt-1 font-sans text-sm font-semibold text-[#1C1917]">
                {client.next_action_type || "None set"}
              </p>
              <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDate(client.next_action_date)}</p>
              <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534E]">Last Contact</p>
              <p className="font-sans text-sm tabular-nums text-[#1C1917]">{formatDate(client.last_contact_at)}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#1C1917]/[0.06] pt-5">
            <button id="qa-add-note" onClick={() => setNoteOpen(true)} className={subtleBtn}>
              <StickyNote size={13} /> Add Note
            </button>
            <button id="qa-add-task" onClick={() => setTaskOpen(true)} className={subtleBtn}>
              <Plus size={13} /> Add Task
            </button>
            <button id="qa-open-brief" onClick={() => setTab("brief")} className={subtleBtn}>
              <FileText size={13} /> {brief ? "Open Brief" : "Link Brief"}
            </button>
            <button id="qa-link-property" onClick={() => setTab("properties")} className={subtleBtn}>
              <Building2 size={13} /> Link Property
            </button>
            {["Request Inspection"].map((label) => (
              <button
                key={label}
                disabled
                title="Coming in a later phase"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#1C1917]/10 bg-white/40 px-3 py-1.5 font-sans text-xs font-medium text-[#57534E] opacity-70"
              >
                {label}
                <span className="rounded-full bg-[#D8C3B8]/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#57534E]">Soon</span>
              </button>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------- Tab bar */}
        <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-[#1C1917]/[0.08]">
          {tabs.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "border-b-2 border-[#B76E79] px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917]"
                  : "border-b-2 border-transparent px-4 py-2.5 font-sans text-sm font-medium text-[#57534E] transition-colors hover:text-[#1C1917]"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ------------------------------------------------ Tab content */}
        <div className="mt-6 pb-16">
          {tab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Stage + summary */}
              <div className={`${panelClass} p-6`} style={panelStyle}>
                <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Household Summary</h2>
                <dl className="space-y-3">
                  {[
                    ["Lifecycle stage", `${LIFECYCLE_LABELS[client.lifecycle_stage]}${lifecycleDays !== null ? ` · ${lifecycleDays} day${lifecycleDays === 1 ? "" : "s"} in stage` : ""}`],
                    ["Buying stage", client.buying_stage ? `${BUYING_LABELS[client.buying_stage]}${buyingDays !== null ? ` · ${buyingDays} day${buyingDays === 1 ? "" : "s"}` : ""}` : "Not started"],
                    ["Members", `${members.length}`],
                    ["Open tasks", `${openTasks.length}`],
                    ["Budget", client.shared_budget_min || client.shared_budget_max
                      ? `$${(client.shared_budget_min || 0).toLocaleString()} – $${(client.shared_budget_max || 0).toLocaleString()}`
                      : "Not recorded"],
                    ["Target locations", client.target_locations_summary || "Not recorded"],
                    ["Client since", formatDate(client.created_at)],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex items-baseline justify-between gap-4">
                      <dt className="font-sans text-xs uppercase tracking-[0.14em] text-[#57534E]">{k}</dt>
                      <dd className="text-right font-sans text-sm tabular-nums text-[#1C1917]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="space-y-6">
                {/* Next action card */}
                <div className={`${panelClass} p-6`} style={panelStyle}>
                  <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Next Action</h2>
                  {client.next_action_type || client.next_action_date ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B76E79]/12">
                        <CalendarClock size={16} className="text-[#8F4E58]" />
                      </div>
                      <div>
                        <p className="font-sans text-sm font-semibold text-[#1C1917]">{client.next_action_type || "Follow up"}</p>
                        <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDate(client.next_action_date)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-sm text-[#8F4E58]">No next action set — a live client should always have one.</p>
                  )}
                </div>

                {/* Recent timeline excerpt */}
                <div className={`${panelClass} p-6`} style={panelStyle}>
                  <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Recent Activity</h2>
                  {activities.slice(0, 3).map((a) => (
                    <div key={a.id} className="border-l-2 border-[#D8C3B8] py-1.5 pl-4">
                      <p className="font-sans text-sm text-[#1C1917]">{EVENT_LABELS[a.event_type] || a.event_type}</p>
                      <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDateTime(a.created_at)}</p>
                    </div>
                  ))}
                  {activities.length === 0 && <p className="font-sans text-sm text-[#57534E]">No activity yet.</p>}
                </div>
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Members</h2>
                <button id="add_member_btn" onClick={() => openMemberDialog(null)} className={subtleBtn}>
                  <Plus size={13} /> Add Member
                </button>
              </div>
              <ul className="divide-y divide-[#1C1917]/[0.06]">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-sans text-[15px] font-semibold text-[#1C1917]">{m.full_name}</p>
                        {m.is_primary_contact && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#B76E79]/35 bg-[#B76E79]/[0.10] px-2.5 py-0.5 font-sans text-[11px] font-semibold text-[#8F4E58]">
                            <Star size={10} fill="currentColor" /> Primary Contact
                          </span>
                        )}
                        {m.is_decision_maker && (
                          <span className="rounded-full border border-[#2D6350]/25 bg-[#2D6350]/[0.07] px-2.5 py-0.5 font-sans text-[11px] font-medium text-[#2D6350]">
                            Decision Maker
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-sans text-sm text-[#57534E]">
                        {ROLE_LABELS[m.role_in_household || "other"]}
                        {m.email ? ` · ${m.email}` : ""}{m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => openMemberDialog(m)}
                      aria-label={`Edit ${m.full_name}`}
                      className="self-start rounded-lg border border-[#1C1917]/12 bg-white/70 p-2 text-[#57534E] transition-colors hover:border-[#2D6350]/30 hover:text-[#2D6350] sm:self-center"
                    >
                      <Pencil size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "tasks" && (
            <div className="space-y-6">
              <div className={`${panelClass} p-6`} style={panelStyle}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                    Open Tasks <span className="tabular-nums">({openTasks.length})</span>
                  </h2>
                  <button id="add_task_btn" onClick={() => setTaskOpen(true)} className={subtleBtn}>
                    <Plus size={13} /> Add Task
                  </button>
                </div>
                {openTasks.length === 0 ? (
                  <p className="font-sans text-sm text-[#57534E]">Nothing open — add a task to keep momentum.</p>
                ) : (
                  <ul className="divide-y divide-[#1C1917]/[0.06]">
                    {openTasks.map((t) => (
                      <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-sans text-[15px] font-semibold text-[#1C1917]">{t.title}</p>
                            <span className="rounded-full border border-[#1C1917]/12 bg-white/80 px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider text-[#57534E]">
                              {t.client_member_id ? memberName(t.client_member_id) || "Member" : "Shared"}
                            </span>
                            {t.priority && t.priority !== "medium" && (
                              <span className="rounded-full border border-[#B76E79]/30 bg-[#B76E79]/[0.08] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#8F4E58]">
                                {t.priority}
                              </span>
                            )}
                          </div>
                          {t.description && <p className="mt-0.5 font-sans text-sm text-[#57534E]">{t.description}</p>}
                          <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
                            {t.due_at ? `Due ${formatDateTime(t.due_at)}` : "No due date"}
                            {t.snoozed_until ? ` · snoozed to ${formatDate(t.snoozed_until)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            data-task-complete={t.title}
                            onClick={() => completeTask(t)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D6350] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-[#173A31] disabled:opacity-60"
                          >
                            <Check size={13} /> Complete
                          </button>
                          <button
                            onClick={() => { setSnoozeTask(t); setSnoozeDate(""); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C1917]/12 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:border-[#2D6350]/30 hover:text-[#2D6350]"
                          >
                            <Clock size={13} /> Snooze
                          </button>
                          <button
                            onClick={() => { setRescheduleTask(t); setRescheduleDate(""); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C1917]/12 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:border-[#2D6350]/30 hover:text-[#2D6350]"
                          >
                            <CalendarClock size={13} /> Reschedule
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {doneTasks.length > 0 && (
                <div className={`${panelClass} p-6`} style={panelStyle}>
                  <h2 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                    Completed <span className="tabular-nums">({doneTasks.length})</span>
                  </h2>
                  <ul className="divide-y divide-[#1C1917]/[0.06]">
                    {doneTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D6350]/10">
                          <Check size={12} className="text-[#2D6350]" />
                        </span>
                        <div>
                          <p className="font-sans text-sm font-medium text-[#57534E] line-through decoration-[#B76E79]/40">{t.title}</p>
                          <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDateTime(t.completed_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "brief" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              {!brief ? (
                /* ------------------------------- no brief linked yet */
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B76E79]/12">
                    <FileText size={18} className="text-[#8F4E58]" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold text-[#1C1917]">No brief linked</h2>
                  <p className="mx-auto mt-2 max-w-md font-sans text-sm text-[#57534E]">
                    Connect one of your client briefs to this household to see its
                    search criteria here and keep everything in one place.
                  </p>
                  <button id="link_brief_btn" onClick={openLinkDialog} className={`${primaryBtn} mt-6`}>
                    <Link2 size={15} /> Link a Brief
                  </button>
                </div>
              ) : (
                /* ------------------------------------ linked brief summary */
                <div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
                        {brief.brief_name || "Client Brief"}
                      </h2>
                      <p className="mt-1 font-sans text-xs text-[#57534E]">
                        Name on brief: {brief.client_name || "—"} · shown here as{" "}
                        <span className="font-medium text-[#1C1917]">{client.household_name}</span>
                      </p>
                    </div>
                    <BriefStatusBadge status={brief.status} />
                  </div>

                  <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {[
                      ["Budget", briefBudget(brief)],
                      ["Bedrooms", rangeLabel(brief.bedrooms_min, brief.bedrooms_max)],
                      ["Bathrooms", rangeLabel(brief.bathrooms_min, brief.bathrooms_max)],
                      ["Locations", briefLocation(brief)],
                      ["Property types", brief.property_types?.length ? brief.property_types.join(", ").replace(/_/g, " ") : "Any"],
                      ["Last updated", formatDate(brief.updated_at)],
                    ].map(([k, v]) => (
                      <div key={k as string} className="flex items-baseline justify-between gap-4 border-b border-[#1C1917]/[0.05] pb-2">
                        <dt className="font-sans text-xs uppercase tracking-[0.14em] text-[#57534E]">{k}</dt>
                        <dd className="text-right font-sans text-sm tabular-nums text-[#1C1917]">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {brief.must_have_features && brief.must_have_features.length > 0 && (
                    <div className="mt-5">
                      <p className="font-sans text-xs uppercase tracking-[0.14em] text-[#57534E]">Must-haves</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {brief.must_have_features.slice(0, 6).map((f) => (
                          <span key={f} className="rounded-full border border-[#2D6350]/20 bg-[#2D6350]/[0.05] px-3 py-1 font-sans text-xs text-[#2D6350]">
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                        {brief.must_have_features.length > 6 && (
                          <span className="px-1 py-1 font-sans text-xs text-[#57534E]">
                            +{brief.must_have_features.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap gap-3 border-t border-[#1C1917]/[0.06] pt-5">
                    <button id="open_full_brief" onClick={() => navigate(`/briefs/${brief.id}`)} className={primaryBtn}>
                      <ExternalLink size={15} /> Open Full Brief
                    </button>
                    <button
                      id="unlink_brief_btn"
                      onClick={() => setUnlinkOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#1C1917]/15 bg-white/80 px-5 py-2.5 font-sans text-sm font-semibold text-[#57534E] transition-colors hover:border-[#8F4E58]/40 hover:text-[#8F4E58]"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "properties" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              {(() => {
                const active = linkedProps.filter((lp) => lp.status !== "passed");
                const passed = linkedProps.filter((lp) => lp.status === "passed");

                const card = (lp: LinkedProperty) => (
                  <li key={lp.id} data-cp-row={propAddress(lp.property)} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-sans text-[15px] font-semibold text-[#1C1917]">
                          {propAddress(lp.property)}
                        </p>
                        <CpStatusBadge
                          status={lp.status}
                          rowKey={propAddress(lp.property)}
                          onChange={() => openCpStatusDialog(lp)}
                        />
                      </div>
                      {lp.property?.title && (
                        <p className="mt-0.5 truncate font-sans text-sm text-[#57534E]">{lp.property.title}</p>
                      )}
                      <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
                        <span className="font-semibold text-[#2D6350]">{propPrice(lp.property)}</span>
                        {propSpecs(lp.property) ? ` · ${propSpecs(lp.property)}` : ""}
                        {daysSince(lp.status_entered_at) !== null
                          ? ` · ${daysSince(lp.status_entered_at)} day${daysSince(lp.status_entered_at) === 1 ? "" : "s"} in ${CP_STATUS_LABELS[lp.status].toLowerCase()}`
                          : ""}
                      </p>
                      {lp.notes && (
                        <p className="mt-1 font-sans text-sm italic text-[#57534E]">"{lp.notes}"</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        data-cp-unlink={propAddress(lp.property)}
                        onClick={() => setUnlinkPropFor(lp)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1C1917]/12 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#57534E] transition-colors hover:border-[#8F4E58]/40 hover:text-[#8F4E58]"
                      >
                        Unlink
                      </button>
                    </div>
                  </li>
                );

                if (linkedProps.length === 0) {
                  return (
                    <div className="py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B76E79]/12">
                        <Building2 size={18} className="text-[#8F4E58]" />
                      </div>
                      <h2 className="mt-4 font-serif text-xl font-semibold text-[#1C1917]">No properties yet</h2>
                      <p className="mx-auto mt-2 max-w-md font-sans text-sm text-[#57534E]">
                        Build this household's pipeline — link candidate properties
                        and move them through shortlist, due diligence, and offer.
                      </p>
                      <button id="add_property_btn" onClick={openAddProperty} className={`${primaryBtn} mt-6`}>
                        <Plus size={15} /> Add Property
                      </button>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                        Property Pipeline <span className="tabular-nums">({active.length})</span>
                      </h2>
                      <button id="add_property_btn" onClick={openAddProperty} className={subtleBtn}>
                        <Plus size={13} /> Add Property
                      </button>
                    </div>

                    {active.length === 0 ? (
                      <p className="font-sans text-sm text-[#57534E]">
                        Nothing in the active pipeline — every linked property has been passed on.
                      </p>
                    ) : (
                      CP_STATUSES.filter((s) => s !== "passed").map((s) => {
                        const group = active.filter((lp) => lp.status === s);
                        if (group.length === 0) return null;
                        return (
                          <div key={s} className="mb-4">
                            <p className="border-b border-[#1C1917]/[0.06] pb-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#57534E]">
                              {CP_STATUS_LABELS[s]} <span className="tabular-nums">({group.length})</span>
                            </p>
                            <ul className="divide-y divide-[#1C1917]/[0.06]">{group.map(card)}</ul>
                          </div>
                        );
                      })
                    )}

                    {passed.length > 0 && (
                      <div className="mt-6 border-t border-[#1C1917]/[0.06] pt-4">
                        <button
                          id="passed_toggle"
                          onClick={() => setShowPassed((v) => !v)}
                          aria-expanded={showPassed}
                          className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#57534E] transition-colors hover:text-[#1C1917]"
                        >
                          <ChevronDown
                            size={13}
                            className={`transition-transform ${showPassed ? "" : "-rotate-90"}`}
                          />
                          Passed <span className="tabular-nums">({passed.length})</span>
                        </button>
                        {showPassed && <ul className="mt-2 divide-y divide-[#1C1917]/[0.06] opacity-80">{passed.map(card)}</ul>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {tab === "inspections" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              {!brief ? (
                /* ------------------- inspections attach via the brief */
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B76E79]/12">
                    <ClipboardCheck size={18} className="text-[#8F4E58]" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold text-[#1C1917]">Inspections arrive via the brief</h2>
                  <p className="mx-auto mt-2 max-w-md font-sans text-sm text-[#57534E]">
                    Inspection jobs are attached to a client brief. Link a brief to
                    this household and any inspections booked against it will
                    appear here automatically.
                  </p>
                  <button id="goto_brief_tab" onClick={() => setTab("brief")} className={`${primaryBtn} mt-6`}>
                    <FileText size={15} /> Go to Brief Tab
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                /* ----------------------- brief linked, nothing booked yet */
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B76E79]/12">
                    <ClipboardCheck size={18} className="text-[#8F4E58]" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold text-[#1C1917]">No inspections yet</h2>
                  <p className="mx-auto mt-2 max-w-md font-sans text-sm text-[#57534E]">
                    Nothing has been booked against{" "}
                    <span className="font-medium text-[#1C1917]">{brief.brief_name || "the linked brief"}</span>{" "}
                    so far. Inspections posted from the marketplace against this
                    brief will appear here.
                  </p>
                </div>
              ) : (
                /* ------------------------------------------- jobs list */
                <div>
                  <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
                    Inspections <span className="tabular-nums">({jobs.length})</span>
                    <span className="ml-2 font-normal normal-case tracking-normal text-[#57534E]">
                      via {brief.brief_name || "linked brief"}
                    </span>
                  </h2>
                  <ul className="divide-y divide-[#1C1917]/[0.06]">
                    {jobs.map((j) => (
                      <li key={j.id} data-job-row={j.title || j.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-sans text-[15px] font-semibold text-[#1C1917]">
                              {j.title || "Inspection job"}
                            </p>
                            <JobStatusBadge status={j.status} />
                          </div>
                          <p className="mt-0.5 truncate font-sans text-sm text-[#57534E]">
                            {j.property_address || "Address not recorded"}
                          </p>
                          <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
                            {jobBudget(j)}
                            {j.assigned_inspector_id
                              ? ` · Inspector: ${inspectorNames[j.assigned_inspector_id] || "Assigned"}`
                              : ""}
                            {` · Posted ${formatDate(j.created_at)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => navigate(`/inspections/spotlights/${j.id}`)}
                            className={subtleBtn}
                          >
                            <ExternalLink size={13} /> View Job
                          </button>
                          {reportJobIds.has(j.id) && (
                            <button
                              onClick={() => navigate(`/inspections/jobs/${j.id}/report/view`)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D6350] px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-[#173A31]"
                            >
                              <FileText size={13} /> View Report
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div className={`${panelClass} p-6`} style={panelStyle}>
              <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">Timeline</h2>
              {activities.length === 0 ? (
                <p className="font-sans text-sm text-[#57534E]">No activity yet.</p>
              ) : (
                <ol className="relative space-y-0 border-l-2 border-[#D8C3B8] pl-6">
                  {activities.map((a) => {
                    const ctx = a.event_context || {};
                    const stageMap =
                      a.event_type === "lifecycle_stage_changed" ? LIFECYCLE_LABELS
                      : a.event_type === "buying_stage_changed" ? BUYING_LABELS
                      : a.event_type === "property_status_changed" ? CP_STATUS_LABELS
                      : null;
                    const detail = stageMap
                      ? `${ctx.address ? `${ctx.address as string} — from` : "From"} ${stageLabel(stageMap, ctx.from)} to ${stageLabel(stageMap, ctx.to)}`
                      : (ctx.title as string) ||
                        (ctx.member as string) ||
                        (ctx.excerpt as string) ||
                        (ctx.brief_name as string) ||
                        (ctx.address as string) ||
                        (ctx.household_name as string) ||
                        "";
                    return (
                      <li key={a.id} className="relative pb-6">
                        <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#B76E79] bg-[#F6F1EA]" />
                        <p className="font-sans text-sm font-semibold text-[#1C1917]">
                          {EVENT_LABELS[a.event_type] || a.event_type}
                        </p>
                        {detail && <p className="font-sans text-sm text-[#57534E]">{detail}</p>}
                        <p className="mt-0.5 font-sans text-xs tabular-nums text-[#57534E]">
                          {a.actor_user_id === user?.id ? "You" : "Team"} · {formatDateTime(a.created_at)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- Dialogs */}
      <Modal
        title={stageDialog === "buying" ? "Change Buying Stage" : "Change Lifecycle Stage"}
        open={!!stageDialog}
        onClose={() => setStageDialog(null)}
      >
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          {stageDialog === "buying"
            ? "Where is this household in the buying process?"
            : "Where does this relationship stand?"}
        </p>
        <div className="space-y-2">
          {(stageDialog === "buying"
            ? [["", "Not started"] as [string, string], ...Object.entries(BUYING_LABELS)]
            : Object.entries(LIFECYCLE_LABELS)
          ).map(([token, label]) => {
            const current = stageDialog === "buying" ? client.buying_stage || "" : client.lifecycle_stage;
            const isCurrent = token === current;
            const isSelected = token === stageChoice;
            return (
              <button
                key={token || "none"}
                id={`stage-opt-${token || "none"}`}
                onClick={() => setStageChoice(token)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-2.5 text-left font-sans text-sm font-semibold text-[#173A31]"
                    : "flex w-full items-center justify-between rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-2.5 text-left font-sans text-sm font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                }
              >
                <span className="flex items-center gap-2">
                  {label}
                  {isCurrent && (
                    <span className="rounded-full bg-[#D8C3B8]/50 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#57534E]">
                      Current
                    </span>
                  )}
                </span>
                {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setStageDialog(null)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button
            id="stage_save"
            onClick={saveStage}
            disabled={busy || stageChoice === (stageDialog === "buying" ? client.buying_stage || "" : client.lifecycle_stage)}
            className={primaryBtn}
          >
            Update Stage
          </button>
        </div>
      </Modal>

      <Modal title="Add Note" open={noteOpen} onClose={() => setNoteOpen(false)}>
        <label htmlFor="note_body" className={labelClass}>Note</label>
        <textarea
          id="note_body"
          rows={5}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="e.g. Spoke with Sarah — finance pre-approval expected Friday."
          className={inputClass}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setNoteOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="note_save" onClick={saveNote} disabled={busy} className={primaryBtn}>Save Note</button>
        </div>
      </Modal>

      <Modal title="Add Task" open={taskOpen} onClose={() => setTaskOpen(false)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="task_title" className={labelClass}>Title *</label>
            <input id="task_title" type="text" value={taskDraft.title}
              onChange={(e) => setTaskDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g. Chase finance pre-approval" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="task_description" className={labelClass}>Description</label>
            <textarea id="task_description" rows={2} value={taskDraft.description}
              onChange={(e) => setTaskDraft((d) => ({ ...d, description: e.target.value }))}
              className={inputClass} />
          </div>
          <div>
            <label htmlFor="task_type" className={labelClass}>Type</label>
            <select id="task_type" value={taskDraft.task_type}
              onChange={(e) => setTaskDraft((d) => ({ ...d, task_type: e.target.value }))} className={inputClass}>
              {TASK_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task_priority" className={labelClass}>Priority</label>
            <select id="task_priority" value={taskDraft.priority}
              onChange={(e) => setTaskDraft((d) => ({ ...d, priority: e.target.value }))} className={inputClass}>
              {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task_due" className={labelClass}>Due</label>
            <input id="task_due" type="datetime-local" value={taskDraft.due_at}
              onChange={(e) => setTaskDraft((d) => ({ ...d, due_at: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="task_member" className={labelClass}>For</label>
            <select id="task_member" value={taskDraft.client_member_id}
              onChange={(e) => setTaskDraft((d) => ({ ...d, client_member_id: e.target.value }))} className={inputClass}>
              <option value="">Shared household task</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setTaskOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="task_save" onClick={saveTask} disabled={busy} className={primaryBtn}>Create Task</button>
        </div>
      </Modal>

      <Modal title={editingMember ? "Edit Member" : "Add Member"} open={memberOpen} onClose={() => setMemberOpen(false)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="memberd_first" className={labelClass}>First Name *</label>
            <input id="memberd_first" type="text" value={memberDraft.first_name}
              onChange={(e) => setMemberDraft((d) => ({ ...d, first_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="memberd_last" className={labelClass}>Last Name</label>
            <input id="memberd_last" type="text" value={memberDraft.last_name}
              onChange={(e) => setMemberDraft((d) => ({ ...d, last_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="memberd_email" className={labelClass}>Email</label>
            <input id="memberd_email" type="email" value={memberDraft.email}
              onChange={(e) => setMemberDraft((d) => ({ ...d, email: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="memberd_phone" className={labelClass}>Phone</label>
            <input id="memberd_phone" type="tel" value={memberDraft.phone}
              onChange={(e) => setMemberDraft((d) => ({ ...d, phone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="memberd_role" className={labelClass}>Role</label>
            <select id="memberd_role" value={memberDraft.role_in_household}
              onChange={(e) => setMemberDraft((d) => ({ ...d, role_in_household: e.target.value }))} className={inputClass}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="flex items-center gap-2 font-sans text-sm text-[#1C1917]">
              <input id="memberd_primary" type="checkbox" checked={memberDraft.is_primary_contact}
                onChange={(e) => setMemberDraft((d) => ({ ...d, is_primary_contact: e.target.checked }))}
                className="h-4 w-4 accent-[#2D6350]" />
              Primary contact
            </label>
            <label className="flex items-center gap-2 font-sans text-sm text-[#1C1917]">
              <input id="memberd_decision" type="checkbox" checked={memberDraft.is_decision_maker}
                onChange={(e) => setMemberDraft((d) => ({ ...d, is_decision_maker: e.target.checked }))}
                className="h-4 w-4 accent-[#2D6350]" />
              Decision maker
            </label>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setMemberOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="memberd_save" onClick={saveMember} disabled={busy} className={primaryBtn}>
            {editingMember ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </Modal>

      <Modal title="Snooze Task" open={!!snoozeTask} onClose={() => setSnoozeTask(null)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Hide <span className="font-semibold text-[#1C1917]">{snoozeTask?.title}</span> until:
        </p>
        <label htmlFor="snooze_date" className={labelClass}>Snooze until</label>
        <input id="snooze_date" type="date" value={snoozeDate}
          onChange={(e) => setSnoozeDate(e.target.value)} className={inputClass} />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setSnoozeTask(null)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="snooze_save" onClick={applySnooze} disabled={busy} className={primaryBtn}>Snooze</button>
        </div>
      </Modal>

      <Modal title="Reschedule Task" open={!!rescheduleTask} onClose={() => setRescheduleTask(null)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          New due date for <span className="font-semibold text-[#1C1917]">{rescheduleTask?.title}</span>:
        </p>
        <label htmlFor="reschedule_date" className={labelClass}>Due</label>
        <input id="reschedule_date" type="datetime-local" value={rescheduleDate}
          onChange={(e) => setRescheduleDate(e.target.value)} className={inputClass} />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setRescheduleTask(null)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="reschedule_save" onClick={applyReschedule} disabled={busy} className={primaryBtn}>Reschedule</button>
        </div>
      </Modal>

      <Modal title="Link a Brief" open={linkOpen} onClose={() => setLinkOpen(false)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Choose one of your briefs to connect to{" "}
          <span className="font-semibold text-[#1C1917]">{client.household_name}</span>.
          Only briefs not already linked to another household are shown.
        </p>
        {linkableLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[#2D6350]/[0.06]" />
            ))}
          </div>
        ) : linkableBriefs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#2D6350]/20 bg-[#F6F1EA]/60 px-5 py-6 text-center font-sans text-sm text-[#57534E]">
            No unlinked briefs available — create one from the Client Briefs page first.
          </p>
        ) : (
          <div className="space-y-2">
            {linkableBriefs.map((b) => {
              const isSelected = b.id === briefChoice;
              return (
                <button
                  key={b.id}
                  data-brief-option={b.brief_name || b.client_name || b.id}
                  onClick={() => setBriefChoice(b.id)}
                  className={
                    isSelected
                      ? "flex w-full items-center justify-between gap-3 rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-3 text-left"
                      : "flex w-full items-center justify-between gap-3 rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-3 text-left transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                  }
                >
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-sm font-semibold text-[#1C1917]">
                      {b.brief_name || "Untitled brief"}
                      {b.client_name ? <span className="font-normal text-[#57534E]"> · {b.client_name}</span> : null}
                    </span>
                    <span className="block truncate font-sans text-xs tabular-nums text-[#57534E]">
                      {briefBudget(b)} · {briefLocation(b)}
                    </span>
                  </span>
                  {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setLinkOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="link_brief_save" onClick={linkBrief} disabled={busy || !briefChoice} className={primaryBtn}>
            <Link2 size={15} /> Link Brief
          </button>
        </div>
      </Modal>

      <Modal title="Unlink Brief" open={unlinkOpen} onClose={() => setUnlinkOpen(false)}>
        <p className="font-sans text-sm text-[#57534E]">
          Disconnect{" "}
          <span className="font-semibold text-[#1C1917]">{brief?.brief_name || brief?.client_name || "this brief"}</span>{" "}
          from {client.household_name}? The brief itself is untouched — it simply
          returns to your unlinked briefs and can be re-linked any time.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setUnlinkOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="unlink_brief_confirm" onClick={unlinkBrief} disabled={busy} className={primaryBtn}>
            Unlink Brief
          </button>
        </div>
      </Modal>

      <Modal title="Add Property" open={addPropOpen} onClose={() => setAddPropOpen(false)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Find a marketplace property to add to{" "}
          <span className="font-semibold text-[#1C1917]">{client.household_name}</span>'s pipeline.
        </p>
        <div className="flex gap-2">
          <input
            id="prop_search_input"
            type="text"
            value={propQuery}
            onChange={(e) => setPropQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") searchProperties(); }}
            placeholder="Search by address, suburb, or title…"
            className={inputClass}
          />
          <button id="prop_search_btn" onClick={searchProperties} disabled={propSearching} className={primaryBtn}>
            Search
          </button>
        </div>

        <div className="mt-4">
          {propSearching ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[#2D6350]/[0.06]" />
              ))}
            </div>
          ) : !propSearched ? (
            <p className="px-1 font-sans text-xs text-[#57534E]">
              Results appear here — up to 8 of the newest matches.
            </p>
          ) : propResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2D6350]/20 bg-[#F6F1EA]/60 px-5 py-6 text-center font-sans text-sm text-[#57534E]">
              No properties matched that search.
            </p>
          ) : (
            <div className="space-y-2">
              {propResults.map((p) => {
                const already = linkedProps.some((lp) => lp.property_id === p.id);
                const isSelected = propChoice?.id === p.id;
                return (
                  <button
                    key={p.id}
                    data-prop-result={propAddress(p)}
                    onClick={() => !already && setPropChoice(p)}
                    disabled={already}
                    className={
                      already
                        ? "flex w-full items-center justify-between gap-3 rounded-xl border border-[#1C1917]/10 bg-white/40 px-4 py-3 text-left opacity-60"
                        : isSelected
                        ? "flex w-full items-center justify-between gap-3 rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-3 text-left"
                        : "flex w-full items-center justify-between gap-3 rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-3 text-left transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-sans text-sm font-semibold text-[#1C1917]">
                        {propAddress(p)}
                      </span>
                      <span className="block truncate font-sans text-xs tabular-nums text-[#57534E]">
                        {propPrice(p)}{propSpecs(p) ? ` · ${propSpecs(p)}` : ""}{p.title ? ` · ${p.title}` : ""}
                      </span>
                    </span>
                    {already ? (
                      <span className="shrink-0 rounded-full bg-[#D8C3B8]/40 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#57534E]">
                        Linked
                      </span>
                    ) : (
                      isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {propChoice && (
          <div className="mt-4">
            <label htmlFor="prop_note" className={labelClass}>Why this property? (optional)</label>
            <textarea
              id="prop_note"
              rows={2}
              value={propNote}
              onChange={(e) => setPropNote(e.target.value)}
              placeholder="e.g. Ticks the north-facing garden and school catchment."
              className={inputClass}
            />
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setAddPropOpen(false)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="link_property_save" onClick={linkProperty} disabled={busy || !propChoice} className={primaryBtn}>
            <Plus size={15} /> Link Property
          </button>
        </div>
      </Modal>

      <Modal title="Change Property Status" open={!!statusDialogFor} onClose={() => setStatusDialogFor(null)}>
        <p className="mb-4 font-sans text-sm text-[#57534E]">
          Where is{" "}
          <span className="font-semibold text-[#1C1917]">{propAddress(statusDialogFor?.property || null)}</span>{" "}
          in this household's pipeline?
        </p>
        <div className="space-y-2">
          {CP_STATUSES.map((token) => {
            const isCurrent = token === statusDialogFor?.status;
            const isSelected = token === cpStatusChoice;
            return (
              <button
                key={token}
                id={`cp-status-opt-${token}`}
                onClick={() => setCpStatusChoice(token)}
                className={
                  isSelected
                    ? "flex w-full items-center justify-between rounded-xl border border-[#2D6350]/50 bg-[#2D6350]/[0.07] px-4 py-2.5 text-left font-sans text-sm font-semibold text-[#173A31]"
                    : "flex w-full items-center justify-between rounded-xl border border-[#1C1917]/10 bg-white/70 px-4 py-2.5 text-left font-sans text-sm font-medium text-[#1C1917] transition-colors hover:border-[#2D6350]/30 hover:bg-[#2D6350]/[0.04]"
                }
              >
                <span className="flex items-center gap-2">
                  {CP_STATUS_LABELS[token]}
                  {isCurrent && (
                    <span className="rounded-full bg-[#D8C3B8]/50 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#57534E]">
                      Current
                    </span>
                  )}
                </span>
                {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-[#2D6350]" />}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setStatusDialogFor(null)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button
            id="cp_status_save"
            onClick={saveCpStatus}
            disabled={busy || cpStatusChoice === statusDialogFor?.status}
            className={primaryBtn}
          >
            Update Status
          </button>
        </div>
      </Modal>

      <Modal title="Unlink Property" open={!!unlinkPropFor} onClose={() => setUnlinkPropFor(null)}>
        <p className="font-sans text-sm text-[#57534E]">
          Remove{" "}
          <span className="font-semibold text-[#1C1917]">{propAddress(unlinkPropFor?.property || null)}</span>{" "}
          from {client.household_name}'s pipeline? The property listing itself is
          untouched — only this household's link (and its note) is removed.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setUnlinkPropFor(null)} className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-4 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white">Cancel</button>
          <button id="unlink_property_confirm" onClick={unlinkProperty} disabled={busy} className={primaryBtn}>
            Unlink Property
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
