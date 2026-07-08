/**
 * GenevaContacts.tsx — Geneva Phase 1: the contacts list.
 *
 * GENEVA is BAH's INTERNAL customer CRM (docs/GENEVA_ROADMAP.md) — Jodie &
 * Dani's growth command-centre for capturing and nurturing buyers agents
 * (and other pros) as BAH's OWN customers. It is NOT Monaco.
 *
 * Access: ADMIN-ONLY shared team view. The route is gated with
 * requiredRole="admin" and RLS enforces is_admin() — so this page fetches
 * ALL geneva_contacts with NO owner filter (deliberate; do not add one).
 * Design: quiet luxury (CLAUDE.md). Data: raw fetch only.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Landmark, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GenevaContact,
  GenevaTask,
  PROFESSIONAL_TYPE_LABELS,
  GENEVA_STAGE_LABELS,
  SOURCE_LABELS,
  CONSENT_LABELS,
  CONTACT_TYPE_LABELS,
  LAUNCH_REGION_SHORT_LABELS,
  ALL_INTERVIEW_STAGE_LABELS,
  restHeaders,
} from "@/lib/geneva";

/* --------------------------------------------------- saved views (Phase 4)
   Preset chips only — Monaco-style, component state (deep-linkable via
   ?view= so the dashboard cards land on the right filter). */

type ViewCtx = { followUpIds: Set<string>; weekAgo: Date };

interface SavedView {
  key: string;
  label: string;
  matches: (c: GenevaContact, ctx: ViewCtx) => boolean;
  emptyCopy: string;
}

const SAVED_VIEWS: SavedView[] = [
  { key: "all", label: "All", matches: () => true, emptyCopy: "" },
  {
    key: "new_week", label: "New this week",
    matches: (c, ctx) => new Date(c.created_at) >= ctx.weekAgo,
    emptyCopy: "No new contacts this week — share the waitlist link around.",
  },
  {
    key: "needs_followup", label: "Needs follow-up",
    matches: (c, ctx) => ctx.followUpIds.has(c.id),
    emptyCopy: "Nothing overdue or due today — the book is tended. ✦",
  },
  {
    key: "subscribed", label: "Subscribed",
    matches: (c) => c.email_consent_status === "subscribed",
    emptyCopy: "No subscribed contacts yet — consent comes from the waitlist checkbox or the contact form.",
  },
  {
    key: "pending", label: "Pending consent",
    matches: (c) => c.email_consent_status === "pending",
    emptyCopy: "No one waiting on consent.",
  },
  {
    key: "prospects", label: "Prospects",
    matches: (c) => ["new", "engaged", "qualified"].includes(c.lifecycle_stage),
    emptyCopy: "No prospects right now — new arrivals land here.",
  },
  {
    key: "nurturing", label: "Nurturing",
    matches: (c) => c.lifecycle_stage === "nurturing",
    emptyCopy: "No one in nurture — move warm contacts here to keep them close.",
  },
  {
    key: "active_customers", label: "Active customers",
    matches: (c) => c.lifecycle_stage === "active_customer",
    emptyCopy: "No active customers yet — they'll be worth the wait. ✦",
  },
  {
    key: "inactive", label: "Inactive",
    matches: (c) => c.lifecycle_stage === "inactive",
    emptyCopy: "No inactive contacts — nothing resting.",
  },
];

/* ------------------------------------------------------- shared visuals */

const panelStyle = {
  background:
    "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
  borderTop: "1px solid rgba(183,110,121,0.3)",
};
const panelClass =
  "rounded-[20px] border border-white/60 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-5 py-3 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31]";

/** Lifecycle stage badge — quiet tones, never traffic lights. */
function StageBadge({ stage }: { stage: string }) {
  const tone =
    stage === "active_customer"
      ? "border-[#2D6350]/25 bg-[#2D6350]/[0.08] text-[#2D6350]"
      : ["engaged", "qualified", "nurturing", "trial_early_access"].includes(stage)
      ? "border-[#B76E79]/30 bg-[#B76E79]/[0.09] text-[#8F4E58]"
      : stage === "inactive"
      ? "border-[#1C1917]/12 bg-white/60 text-[#57534E]"
      : "border-[#1C1917]/15 bg-[#D8C3B8]/25 text-[#57534E]"; // new
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 font-sans text-xs font-medium ${tone}`}>
      {GENEVA_STAGE_LABELS[stage] || stage}
    </span>
  );
}

/** Professional-type chip — neutral, elegant. */
function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#1C1917]/12 bg-white/80 px-2.5 py-1 font-sans text-xs font-medium text-[#1C1917]">
      {PROFESSIONAL_TYPE_LABELS[type] || type}
    </span>
  );
}

/** Discreet consent indicator: a small dot + tiny label. */
function ConsentDot({ status }: { status: string }) {
  const dot =
    status === "subscribed"
      ? "bg-[#2D6350]"
      : status === "pending"
      ? "bg-[#D8C3B8]"
      : "bg-[#8F4E58]/60"; // unsubscribed / bounced / complained
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-xs text-[#57534E]">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {CONSENT_LABELS[status] || status}
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/* --------------------------------------------------------------- page */

export default function GenevaContacts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<GenevaContact[]>([]);
  const [followUpIds, setFollowUpIds] = useState<Set<string>>(new Set());
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savedView, setSavedView] = useState<string>(() => {
    const v = searchParams.get("view");
    return v && SAVED_VIEWS.some((s) => s.key === v) ? v : "all";
  });
  // Launch-region filter — combines with the saved view (e.g. Prospects +
  // Greater Sydney). "all" = no region narrowing. Deep-linkable via ?region=
  // (the dashboard's Demand-by-Region bars land here).
  const [regionFilter, setRegionFilter] = useState<string>(() => {
    const r = searchParams.get("region");
    return r && LAUNCH_REGION_SHORT_LABELS[r] ? r : "all";
  });
  // Waitlist vs interview-outreach — the two populations viewed separately.
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    const t = searchParams.get("type");
    return t && CONTACT_TYPE_LABELS[t] ? t : "all";
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const headers = restHeaders();
        // Shared team view: ALL contacts, newest first. RLS = admin-only.
        const [res, tRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/geneva_contacts?select=*&order=created_at.desc`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/geneva_tasks?status=eq.open&select=contact_id,due_at`, { headers }),
        ]);
        const rows: GenevaContact[] = res.ok ? await res.json() : [];
        setContacts(rows);

        // "Needs follow-up" = an open task overdue or due today
        const tasks: Pick<GenevaTask, "contact_id" | "due_at">[] = tRes.ok ? await tRes.json() : [];
        const eod = new Date(); eod.setHours(23, 59, 59, 999);
        setFollowUpIds(new Set(
          tasks.filter((t) => t.due_at && new Date(t.due_at) <= eod).map((t) => t.contact_id)
        ));

        const ownerIds = [...new Set(rows.map((c) => c.owner_id).filter(Boolean))] as string[];
        if (ownerIds.length > 0) {
          const pRes = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=in.(${ownerIds.join(",")})&select=id,full_name`,
            { headers }
          );
          const profiles: { id: string; full_name: string }[] = pRes.ok ? await pRes.json() : [];
          setOwnerNames(Object.fromEntries(profiles.map((p) => [p.id, p.full_name])));
        }
      } catch (e) {
        console.error("Error loading Geneva contacts:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, supabaseUrl]);

  const viewCtx = useMemo<ViewCtx>(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return { followUpIds, weekAgo };
  }, [followUpIds]);

  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of SAVED_VIEWS) counts[v.key] = contacts.filter((c) => v.matches(c, viewCtx)).length;
    return counts;
  }, [contacts, viewCtx]);

  const activeView = SAVED_VIEWS.find((v) => v.key === savedView) ?? SAVED_VIEWS[0];

  const matchesRegion = (c: GenevaContact, token: string) =>
    token === "all" || (c.launch_regions ?? []).includes(token);

  const matchesType = (c: GenevaContact, t: string) =>
    t === "all" || (c.contact_type || "waitlist") === t;

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          activeView.matches(c, viewCtx) &&
          matchesRegion(c, regionFilter) &&
          matchesType(c, typeFilter)
      ),
    [contacts, activeView, viewCtx, regionFilter, typeFilter]
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length };
    for (const t of Object.keys(CONTACT_TYPE_LABELS)) {
      counts[t] = contacts.filter((c) => matchesType(c, t)).length;
    }
    return counts;
  }, [contacts]);

  // Region-chip counts reflect the ACTIVE saved view, so the two filter rows
  // always agree with each other and with the list below them.
  const regionCounts = useMemo(() => {
    const inView = contacts.filter((c) => activeView.matches(c, viewCtx));
    const counts: Record<string, number> = { all: inView.length };
    for (const token of Object.keys(LAUNCH_REGION_SHORT_LABELS)) {
      counts[token] = inView.filter((c) => matchesRegion(c, token)).length;
    }
    return counts;
  }, [contacts, activeView, viewCtx]);

  const subtitleCounts = useMemo(() => {
    const subscribed = contacts.filter((c) => c.email_consent_status === "subscribed").length;
    return { total: contacts.length, subscribed };
  }, [contacts]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <Link
          to="/geneva"
          className="mb-4 inline-flex items-center gap-2 py-3 -my-3 px-2 -mx-2 font-sans text-sm font-medium text-[#2D6350] transition-colors hover:text-[#173A31]"
        >
          <ArrowLeft size={15} /> Command Centre
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#8F4E58]">
              Internal · Geneva
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">
              Contacts
            </h1>
            <p className="mt-2 font-sans text-sm text-[#57534E]">
              Your growth command centre — every interested professional, captured and followed up
              {subtitleCounts.total > 0 && (
                <span className="tabular-nums">
                  {" "}· {subtitleCounts.total} contact{subtitleCounts.total === 1 ? "" : "s"}, {subtitleCounts.subscribed} subscribed
                </span>
              )}
            </p>
          </div>
          <button id="add_contact_btn" onClick={() => navigate("/geneva/contacts/new")} className={primaryBtn}>
            <Plus size={16} />
            Add Contact
          </button>
        </div>

        {/* Saved views — preset filter chips (Phase 4) */}
        {contacts.length > 0 && !loading && (
          <div role="group" aria-label="Saved views" className="mb-6 flex flex-wrap items-center gap-2">
            {SAVED_VIEWS.map((v) => {
              const isActive = savedView === v.key;
              return (
                <button
                  key={v.key}
                  id={`gview-${v.key}`}
                  onClick={() => setSavedView(v.key)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "inline-flex items-center gap-2 rounded-full bg-[#2D6350] px-4 py-1.5 font-sans text-xs font-semibold text-white shadow-[0_6px_14px_-4px_rgba(23,58,49,0.45)]"
                      : "inline-flex items-center gap-2 rounded-full border border-[#1C1917]/12 bg-white/70 px-4 py-1.5 font-sans text-xs font-medium text-[#57534E] backdrop-blur-sm transition-colors duration-150 hover:border-[#2D6350]/35 hover:text-[#1C1917]"
                  }
                >
                  {v.label}
                  <span
                    className={
                      isActive
                        ? "rounded-full bg-white/[0.18] px-2 py-px font-sans text-xs font-semibold tabular-nums text-white"
                        : "font-sans text-xs font-semibold tabular-nums text-[#8F4E58]"
                    }
                  >
                    {viewCounts[v.key]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Contact-type filter — waitlist vs interview-outreach, champagne
            accent (the compliance dimension gets its own quiet layer) */}
        {contacts.length > 0 && !loading && typeCounts.interview_outreach > 0 && (
          <div role="group" aria-label="Filter by contact type" className="mb-4 flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#57534E]">
              Type
            </span>
            {[["all", "All types"], ...Object.entries(CONTACT_TYPE_LABELS)].map(([token, label]) => {
              const isActive = typeFilter === token;
              return (
                <button
                  key={token}
                  id={`gtype-${token}`}
                  onClick={() => setTypeFilter(token)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "inline-flex items-center gap-2 rounded-full bg-[#57534E] px-3.5 py-1.5 font-sans text-xs font-semibold text-white shadow-[0_6px_14px_-4px_rgba(87,83,78,0.4)]"
                      : "inline-flex items-center gap-2 rounded-full border border-[#1C1917]/12 bg-white/70 px-3.5 py-1.5 font-sans text-xs font-medium text-[#57534E] backdrop-blur-sm transition-colors duration-150 hover:border-[#57534E]/40 hover:text-[#1C1917]"
                  }
                >
                  {label}
                  <span
                    className={
                      isActive
                        ? "rounded-full bg-white/[0.18] px-1.5 py-px font-sans text-xs font-semibold tabular-nums text-white"
                        : "font-sans text-xs font-semibold tabular-nums text-[#8F4E58]"
                    }
                  >
                    {typeCounts[token]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Launch-region filter — deep-rose accent so the two filter layers
            read distinctly (forest = view, rose = region) */}
        {contacts.length > 0 && !loading && (
          <div role="group" aria-label="Filter by launch region" className="mb-6 flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#57534E]">
              Region
            </span>
            {[["all", "All regions"], ...Object.entries(LAUNCH_REGION_SHORT_LABELS)].map(([token, label]) => {
              const isActive = regionFilter === token;
              return (
                <button
                  key={token}
                  id={`gregion-${token}`}
                  onClick={() => setRegionFilter(token)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "inline-flex items-center gap-2 rounded-full bg-[#8F4E58] px-3.5 py-1.5 font-sans text-xs font-semibold text-white shadow-[0_6px_14px_-4px_rgba(143,78,88,0.45)]"
                      : "inline-flex items-center gap-2 rounded-full border border-[#1C1917]/12 bg-white/70 px-3.5 py-1.5 font-sans text-xs font-medium text-[#57534E] backdrop-blur-sm transition-colors duration-150 hover:border-[#8F4E58]/40 hover:text-[#1C1917]"
                  }
                >
                  {label}
                  <span
                    className={
                      isActive
                        ? "rounded-full bg-white/[0.18] px-1.5 py-px font-sans text-xs font-semibold tabular-nums text-white"
                        : "font-sans text-xs font-semibold tabular-nums text-[#8F4E58]"
                    }
                  >
                    {regionCounts[token]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-sans text-sm text-[#57534E]">Loading contacts…</p>
          </div>
        ) : contacts.length === 0 ? (
          /* ------------------------------------ empty state — calm, on-brand */
          <div className={`${panelClass} px-8 py-20 text-center`} style={panelStyle}>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B76E79]/12">
              <Landmark size={22} className="text-[#8F4E58]" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
              The book is open
            </h2>
            <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-[#57534E]">
              Every buyers agent who shows interest belongs here — captured with their
              source, followed up on time, and nurtured until they're ready. Add your
              first contact to begin.
            </p>
            <button
              id="empty_add_contact_btn"
              onClick={() => navigate("/geneva/contacts/new")}
              className={`${primaryBtn} mt-8 px-6`}
            >
              <Plus size={16} />
              Add Contact
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          /* Calm empty state — the book has contacts, this view/region combo has none */
          <div className={`${panelClass} px-8 py-16 text-center`} style={panelStyle}>
            <p aria-hidden="true" className="font-serif text-2xl text-[#B76E79]">✦</p>
            <p className="mt-3 font-serif text-xl font-semibold text-[#1C1917]">
              {regionFilter !== "all"
                ? `No one here works in ${LAUNCH_REGION_SHORT_LABELS[regionFilter]} — yet.`
                : activeView.emptyCopy || "Nothing in this view."}
            </p>
            <button
              onClick={() => { setSavedView("all"); setRegionFilter("all"); }}
              className="mt-6 rounded-full border border-[#2D6350]/30 bg-white/70 px-5 py-2 font-sans text-xs font-semibold text-[#2D6350] transition-colors duration-150 hover:border-[#2D6350]/50 hover:bg-[#2D6350]/[0.06]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* -------------------------------------------------------- list */
          <div className={`${panelClass} overflow-hidden`} style={panelStyle}>
            {/* Column headings (desktop) */}
            <div className="hidden border-b border-[#1C1917]/[0.06] px-6 py-3 lg:grid lg:grid-cols-[2.4fr_1.2fr_1.4fr_1fr_1.2fr] lg:gap-4">
              {["Contact", "Type", "Stage", "Source", "Owner · Added"].map((h) => (
                <p key={h} className="font-sans text-xs uppercase tracking-[0.18em] text-[#57534E]">
                  {h}
                </p>
              ))}
            </div>

            <ul className="divide-y divide-[#1C1917]/[0.06]">
              {filteredContacts.map((c) => {
                const name = `${c.first_name}${c.last_name ? ` ${c.last_name}` : ""}`;
                const meta = [c.email, c.company, c.region_city].filter(Boolean).join(" · ");
                return (
                  <li key={c.id}>
                    <button
                      data-contact-row={c.email}
                      onClick={() => navigate(`/geneva/contacts/${c.id}`)}
                      aria-label={`Open ${name}`}
                      className="group grid w-full grid-cols-1 gap-2 px-6 py-4 text-left transition-colors hover:bg-[#2D6350]/[0.03] lg:grid-cols-[2.4fr_1.2fr_1.4fr_1fr_1.2fr] lg:items-center lg:gap-4"
                    >
                      {/* Contact */}
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-serif text-lg font-semibold leading-snug text-[#1C1917]">
                          <span className="min-w-0 break-words">{name}</span>
                          {c.contact_type === "interview_outreach" && (
                            <span className="shrink-0 rounded-full border border-[#D8C3B8]/80 bg-[#D8C3B8]/[0.28] px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#8F4E58]">
                              Outreach
                            </span>
                          )}
                          <ChevronRight size={13} className="shrink-0 text-[#8F4E58] opacity-0 transition-opacity group-hover:opacity-70" />
                        </p>
                        <p className="break-words font-sans text-xs text-[#57534E]">{meta}</p>
                      </div>
                      {/* Type */}
                      <div>
                        <TypeBadge type={c.professional_type} />
                      </div>
                      {/* Stage + consent — outreach rows show the INTERVIEW
                          stage (their lifecycle value is dormant) */}
                      <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
                        {c.contact_type === "interview_outreach" ? (
                          <span
                            data-interview-badge={c.email}
                            className="inline-flex items-center rounded-md border border-[#B76E79]/30 bg-[#B76E79]/[0.09] px-2.5 py-1 font-sans text-xs font-medium text-[#8F4E58]"
                          >
                            {ALL_INTERVIEW_STAGE_LABELS[c.interview_stage || "to_contact"] || c.interview_stage}
                          </span>
                        ) : (
                          <StageBadge stage={c.lifecycle_stage} />
                        )}
                        <ConsentDot status={c.email_consent_status} />
                      </div>
                      {/* Source */}
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-[#1C1917]">
                          {c.original_source ? SOURCE_LABELS[c.original_source] || c.original_source : "—"}
                        </p>
                        {c.source_detail && (
                          <p className="break-words font-sans text-xs text-[#57534E]">{c.source_detail}</p>
                        )}
                      </div>
                      {/* Owner + added */}
                      <div>
                        <p className="font-sans text-sm text-[#1C1917]">
                          {c.owner_id ? ownerNames[c.owner_id] || "Team" : "Unassigned"}
                        </p>
                        <p className="font-sans text-xs tabular-nums text-[#57534E]">{formatDate(c.created_at)}</p>
                      </div>
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
