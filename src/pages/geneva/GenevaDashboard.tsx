/**
 * GenevaDashboard.tsx — Geneva Phase 4: the growth command centre.
 *
 * The founder's five questions, answered at a glance:
 *   How's my funnel? Where do leads get stuck? Which channels bring the
 *   best leads? Who must I follow up TODAY? Are we growing?
 *
 * ADMIN-ONLY shared team view (route gated requiredRole="admin"; RLS
 * enforces is_admin). Raw fetch via src/lib/geneva.ts — no owner filters.
 * Design: quiet luxury per docs/BRAND_KIT.md — calm, tabular numbers,
 * gentle highlights, ✦ empty state when the book is empty.
 *
 * Dev note: append ?empty=1 to preview the zero-data state without
 * touching real rows (design verification only — data is never modified).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Users,
  Mail,
  Sparkle,
  CalendarClock,
  Hourglass,
  ArrowRight,
  Landmark,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GenevaContact,
  GenevaTask,
  PROFESSIONAL_TYPE_LABELS,
  GENEVA_STAGE_LABELS,
  SOURCE_LABELS,
  LAUNCH_REGION_SHORT_LABELS,
  INTERVIEW_STAGE_LABELS,
  INTERVIEW_EXIT_LABELS,
  restHeaders,
} from "@/lib/geneva";

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
const subtleBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-[#2D6350]/25 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#2D6350] transition-colors hover:bg-[#2D6350]/[0.06]";
const sectionTitle =
  "font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]";

/** Funnel stage order — inactive sits OUTSIDE the flow, shown separately. */
const FUNNEL_STAGES = [
  "new", "engaged", "qualified", "nurturing", "trial_early_access", "active_customer",
] as const;

const QUALITY_STAGES = new Set(["qualified", "nurturing", "trial_early_access", "active_customer"]);

/* --------------------------------------------------------------- utils */

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

/* ------------------------------------------------------------ component */

export default function GenevaDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const previewEmpty = searchParams.get("empty") === "1"; // design preview only

  const [contacts, setContacts] = useState<GenevaContact[]>([]);
  const [openTasks, setOpenTasks] = useState<GenevaTask[]>([]);
  const [loading, setLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const headers = restHeaders();
        const [cRes, tRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/geneva_contacts?select=*&order=created_at.desc`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/geneva_tasks?status=eq.open&select=*&order=due_at.asc.nullslast`, { headers }),
        ]);
        setContacts(cRes.ok ? await cRes.json() : []);
        setOpenTasks(tRes.ok ? await tRes.json() : []);
      } catch (e) {
        console.error("Error loading Geneva dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, supabaseUrl]);

  const data = previewEmpty ? [] : contacts;
  const tasks = previewEmpty ? [] : openTasks;

  /* ------------------------------------------------------ derivations
     TWO POPULATIONS (Interview Funnel piece 4): lifecycle-based metrics —
     the funnel, growth signal, channel quality, active customers, new this
     week — count WAITLIST contacts only, so conversion numbers stay about
     people who came to US. Population-agnostic stats (totals, subscribed,
     follow-ups, types, regions) stay whole and say so. Outreach contacts
     get their own Interview Funnel widget below. */

  const waitlist = useMemo(
    () => data.filter((c) => (c.contact_type || "waitlist") === "waitlist"),
    [data]
  );
  const outreach = useMemo(
    () => data.filter((c) => c.contact_type === "interview_outreach"),
    [data]
  );

  const active = useMemo(() => waitlist.filter((c) => c.lifecycle_stage !== "inactive"), [waitlist]);
  const inactive = useMemo(() => waitlist.filter((c) => c.lifecycle_stage === "inactive"), [waitlist]);

  // Funnel: cumulative "reached at least this stage" gives a true taper on
  // snapshot data; per-stage counts show who is there NOW.
  const funnel = useMemo(() => {
    const stageIdx = (s: string) => FUNNEL_STAGES.indexOf(s as (typeof FUNNEL_STAGES)[number]);
    const rows = FUNNEL_STAGES.map((stage, i) => {
      const here = active.filter((c) => c.lifecycle_stage === stage).length;
      const reached = active.filter((c) => stageIdx(c.lifecycle_stage) >= i).length;
      return { stage, here, reached };
    });
    const total = rows[0]?.reached ?? 0;
    const withPct = rows.map((r, i) => ({
      ...r,
      reachPct: pct(r.reached, total),
      advancePct: i < rows.length - 1 ? pct(rows[i + 1].reached, r.reached) : null,
    }));
    // Biggest drop-off = the transition with the LOWEST advance %
    let dropIdx = -1, worst = 101;
    withPct.forEach((r, i) => {
      if (r.advancePct !== null && r.reached > 0 && r.advancePct < worst) { worst = r.advancePct; dropIdx = i; }
    });
    return { rows: withPct, total, dropIdx };
  }, [active]);

  const overdueOrToday = useMemo(() => {
    const eod = endOfToday().getTime();
    return tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() <= eod);
  }, [tasks]);

  const metrics = useMemo(() => {
    const weekAgo = daysAgo(7);
    return {
      total: data.length, // whole book — labelled
      subscribed: data.filter((c) => c.email_consent_status === "subscribed").length, // consent is population-agnostic
      newThisWeek: waitlist.filter((c) => new Date(c.created_at) >= weekAgo).length, // inbound demand = waitlist
      needsFollowUp: new Set(overdueOrToday.map((t) => t.contact_id)).size, // action metric — whole book
      activeCustomers: waitlist.filter((c) => c.lifecycle_stage === "active_customer").length, // lifecycle = waitlist
    };
  }, [data, waitlist, overdueOrToday]);

  // Growth: new WAITLIST contacts per week (inbound demand — adding outreach
  // contacts by hand isn't growth)
  const growth = useMemo(() => {
    const weeks = [3, 2, 1, 0].map((w) => {
      const from = daysAgo((w + 1) * 7);
      const to = daysAgo(w * 7);
      const count = waitlist.filter((c) => {
        const d = new Date(c.created_at);
        return d >= from && d < to;
      }).length;
      return { label: w === 0 ? "This wk" : `${w} wk${w > 1 ? "s" : ""} ago`, count };
    });
    const max = Math.max(1, ...weeks.map((x) => x.count));
    return { weeks, max, thisWeek: weeks[3].count, lastWeek: weeks[2].count };
  }, [waitlist]);

  // Interview Funnel widget: outreach contacts per stage, journey order
  const interviewFunnel = useMemo(() => {
    const stageCount = (token: string) =>
      outreach.filter((c) => (c.interview_stage || "to_contact") === token).length;
    const steps = Object.keys(INTERVIEW_STAGE_LABELS).map((token) => ({ token, n: stageCount(token) }));
    const exits = Object.keys(INTERVIEW_EXIT_LABELS).map((token) => ({ token, n: stageCount(token) }));
    return { steps, exits, total: outreach.length };
  }, [outreach]);

  // Channels: WAITLIST volume + how many reached qualified-or-beyond
  // (lifecycle quality is a waitlist concept)
  const channels = useMemo(() => {
    const map = new Map<string, { total: number; quality: number }>();
    for (const c of waitlist) {
      const key = c.original_source || "unknown";
      const e = map.get(key) ?? { total: 0, quality: 0 };
      e.total++;
      if (QUALITY_STAGES.has(c.lifecycle_stage)) e.quality++;
      map.set(key, e);
    }
    const rows = [...map.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.quality - a.quality || b.total - a.total);
    const max = Math.max(1, ...rows.map((r) => r.total));
    return { rows: rows.slice(0, 8), max };
  }, [waitlist]);

  // Demand by region: how many contacts work in each launch region.
  // One contact can work in several, so totals can exceed the contact count
  // — the widget subtitle says so explicitly.
  const regionDemand = useMemo(() => {
    const rows = Object.keys(LAUNCH_REGION_SHORT_LABELS)
      .map((token) => ({
        token,
        n: data.filter((c) => (c.launch_regions ?? []).includes(token)).length,
      }))
      .filter((r) => r.n > 0)
      .sort((a, b) => b.n - a.n);
    const noRegion = data.filter((c) => !c.launch_regions || c.launch_regions.length === 0).length;
    const max = Math.max(1, ...rows.map((r) => r.n));
    return { rows, noRegion, max };
  }, [data]);

  const types = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data) map.set(c.professional_type, (map.get(c.professional_type) ?? 0) + 1);
    const rows = [...map.entries()].map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...rows.map((r) => r.n));
    return { rows, max };
  }, [data]);

  // Needs attention: contacts with the most-overdue open tasks first
  const attention = useMemo(() => {
    const byContact = new Map<string, GenevaTask>();
    for (const t of overdueOrToday) {
      const prev = byContact.get(t.contact_id);
      if (!prev || new Date(t.due_at!) < new Date(prev.due_at!)) byContact.set(t.contact_id, t);
    }
    const sod = startOfToday().getTime();
    return [...byContact.entries()]
      .map(([contactId, task]) => {
        const contact = data.find((c) => c.id === contactId);
        if (!contact) return null;
        const due = new Date(task.due_at!).getTime();
        const overdueDays = due < sod ? Math.ceil((sod - due) / 86400000) : 0;
        return { contact, task, overdueDays };
      })
      .filter(Boolean)
      .sort((a, b) => b!.overdueDays - a!.overdueDays)
      .slice(0, 5) as { contact: GenevaContact; task: GenevaTask; overdueDays: number }[];
  }, [overdueOrToday, data]);

  /* --------------------------------------------------------------- UI */

  const metricCards: { label: string; value: number; icon: React.ElementType; view: string | null }[] = [
    { label: "Total Contacts", value: metrics.total, icon: Users, view: "all" },
    { label: "Subscribed", value: metrics.subscribed, icon: Mail, view: "subscribed" },
    { label: "New This Week", value: metrics.newThisWeek, icon: Sparkle, view: "new_week" },
    { label: "Needs Follow-Up", value: metrics.needsFollowUp, icon: CalendarClock, view: "needs_followup" },
    { label: "Active Customers", value: metrics.activeCustomers, icon: Landmark, view: "active_customers" },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#8F4E58]">
              Internal · Geneva
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">
              Command Centre
            </h1>
            <p className="mt-2 font-sans text-sm text-[#57534E]">
              The funnel, the channels, and who needs you today
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button id="gd-add-contact" onClick={() => navigate("/geneva/contacts/new")} className={primaryBtn}>
              <Plus size={16} /> Add Contact
            </button>
            <Link
              id="gd-view-contacts"
              to="/geneva/contacts"
              className="inline-flex items-center gap-2 rounded-xl border border-[#2D6350]/30 bg-white/70 px-5 py-3 font-sans text-sm font-semibold text-[#2D6350] transition-colors hover:bg-[#2D6350]/[0.06]"
            >
              View All Contacts <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {loading ? (
          /* ---------------------------------------------- skeletons */
          <div className="space-y-6 pb-16">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`${panelClass} h-28 animate-pulse`} style={panelStyle} />
              ))}
            </div>
            <div className={`${panelClass} h-96 animate-pulse`} style={panelStyle} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={`${panelClass} h-64 animate-pulse`} style={panelStyle} />
              <div className={`${panelClass} h-64 animate-pulse`} style={panelStyle} />
            </div>
          </div>
        ) : data.length === 0 ? (
          /* -------------------------------------- ✦ zero-data state */
          <div className={`${panelClass} px-8 py-24 text-center`} style={panelStyle}>
            <p aria-hidden="true" className="font-serif text-3xl text-[#B76E79]">✦</p>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-[#1C1917]">
              Your command centre awaits
            </h2>
            <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-[#57534E]">
              As contacts arrive — from the landing-page waitlist or added by
              hand — the funnel, channels, and follow-ups take shape here.
              Add the first contact and watch it come alive.
            </p>
            <button onClick={() => navigate("/geneva/contacts/new")} className={`${primaryBtn} mt-8 px-6`}>
              <Plus size={16} /> Add Contact
            </button>
          </div>
        ) : (
          <div className="space-y-6 pb-16">
            {/* --------------------------------------- 1. Metric cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {metricCards.map((m) => (
                <button
                  key={m.label}
                  data-metric={m.label}
                  onClick={() => m.view && navigate(`/geneva/contacts?view=${m.view}`)}
                  className={`${panelClass} group p-5 text-left transition-all duration-200 hover:-translate-y-0.5`}
                  style={panelStyle}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B76E79]/12">
                    <m.icon size={15} className="text-[#8F4E58]" strokeWidth={2} />
                  </div>
                  <p className="mt-3 font-sans text-3xl font-semibold tabular-nums text-[#1C1917]">
                    {m.value}
                  </p>
                  <p className="mt-0.5 font-sans text-xs font-medium uppercase tracking-[0.14em] text-[#57534E]">
                    {m.label}
                  </p>
                </button>
              ))}
            </div>

            {/* ------------------------------------------ 2. The funnel */}
            <div className={`${panelClass} p-6 lg:p-8`} style={panelStyle}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={sectionTitle}>The Waitlist Funnel</h2>
                <p className="font-sans text-xs text-[#57534E]">
                  People who came to us · outreach lives in its own funnel below
                </p>
              </div>
              <div className="mt-5 space-y-3">
                {funnel.rows.map((r, i) => (
                  <div key={r.stage} data-funnel-stage={r.stage}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="font-sans text-xs font-medium text-[#1C1917] lg:text-sm">
                        {GENEVA_STAGE_LABELS[r.stage]}
                      </p>
                      <p className="font-sans text-xs text-[#57534E]">
                        <span className="text-base font-semibold tabular-nums text-[#1C1917]">{r.here}</span> here
                        <span className="ml-1.5 tabular-nums">· {r.reachPct}% reach</span>
                      </p>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#2D6350]/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(r.reachPct, r.reached > 0 ? 4 : 0)}%`,
                          background: `linear-gradient(90deg, #2D6350 0%, ${i >= 4 ? "#3E8066" : "#35705B"} 100%)`,
                        }}
                      />
                    </div>
                    {r.advancePct !== null && (
                      <div className="flex items-center py-1">
                        {funnel.dropIdx === i ? (
                          <span
                            data-dropoff
                            className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.25] px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#8F4E58]"
                          >
                            <Hourglass size={9} strokeWidth={2.25} />
                            Biggest drop-off · <span className="tabular-nums">{r.advancePct}%</span> advance
                          </span>
                        ) : (
                          <span className="font-sans text-xs tabular-nums text-[#57534E]/80">
                            ↓ {r.advancePct}% advance
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Inactive — outside the flow, deliberately */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1C1917]/[0.06] pt-4">
                <p className="font-sans text-xs text-[#57534E]">
                  <span className="font-semibold tabular-nums text-[#1C1917]">{inactive.length}</span> inactive
                  {inactive.length > 0 && " — resting outside the funnel, each with a recorded reason"}
                </p>
                {inactive.length > 0 && (
                  <Link
                    to="/geneva/contacts?view=inactive"
                    className="inline-flex items-center py-3.5 -my-3.5 px-2 -mx-2 font-sans text-xs font-semibold text-[#2D6350] hover:text-[#173A31]"
                  >
                    View inactive →
                  </Link>
                )}
              </div>
            </div>

            {/* -------------------------- 2b. The INTERVIEW funnel widget
                The other population: agents WE reach out to. Deliberately
                its own panel so the waitlist funnel above stays honest. */}
            <div className={`${panelClass} p-6 lg:p-8`} style={panelStyle}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={sectionTitle}>The Interview Funnel</h2>
                <p className="font-sans text-xs text-[#57534E]">
                  Agents we're reaching out to — white glove, one at a time
                </p>
              </div>
              {interviewFunnel.total === 0 ? (
                <div className="py-8 text-center">
                  <p aria-hidden="true" className="font-serif text-xl text-[#B76E79]">✦</p>
                  <p className="mt-2 font-sans text-sm text-[#57534E]">
                    No interview outreach yet — add your first treasured agent.
                  </p>
                  <button
                    onClick={() => navigate("/geneva/contacts/new")}
                    className="mt-4 rounded-full border border-[#2D6350]/30 bg-white/70 px-5 py-2 font-sans text-xs font-semibold text-[#2D6350] transition-colors duration-150 hover:border-[#2D6350]/50 hover:bg-[#2D6350]/[0.06]"
                  >
                    Add outreach contact
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-2 font-sans text-sm text-[#57534E]">
                    <span data-interview-total className="font-serif text-2xl font-semibold tabular-nums text-[#1C1917]">
                      {interviewFunnel.total}
                    </span>{" "}
                    agent{interviewFunnel.total === 1 ? "" : "s"} in the interview funnel
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {interviewFunnel.steps.map(({ token, n }, i) => (
                      <button
                        key={token}
                        data-ifunnel-stage={token}
                        onClick={() => n > 0 && navigate("/geneva/contacts?type=interview_outreach")}
                        disabled={n === 0}
                        className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                          n > 0 ? "hover:bg-[#B76E79]/[0.06] cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <span className={`flex items-center gap-2 font-sans text-xs ${n > 0 ? "font-medium text-[#1C1917]" : "text-[#57534E]/70"}`}>
                          <span className="font-sans text-xs font-semibold tabular-nums text-[#8F4E58]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {INTERVIEW_STAGE_LABELS[token]}
                        </span>
                        <span className={`font-sans text-sm font-semibold tabular-nums ${n > 0 ? "text-[#8F4E58]" : "text-[#57534E]/50"}`}>
                          {n}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-[#1C1917]/[0.06] pt-3">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#57534E]">
                      If they said no
                    </span>
                    {interviewFunnel.exits.map(({ token, n }) => (
                      <span key={token} data-ifunnel-exit={token} className="font-sans text-xs text-[#57534E]">
                        {INTERVIEW_EXIT_LABELS[token]}:{" "}
                        <span className="font-semibold tabular-nums text-[#1C1917]">{n}</span>
                      </span>
                    ))}
                    <Link
                      to="/geneva/contacts?type=interview_outreach"
                      className="ml-auto font-sans text-xs font-semibold text-[#2D6350] hover:text-[#173A31]"
                    >
                      View outreach contacts →
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* --------------------------- 3+4. Growth signal & channels */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Growth */}
              <div className={`${panelClass} p-6 lg:col-span-2`} style={panelStyle}>
                <h2 className={sectionTitle}>Growth Signal</h2>
                <p className="mt-1 font-sans text-xs text-[#57534E]">New waitlist contacts per week</p>
                <div className="mt-6 flex h-36 items-end gap-3">
                  {growth.weeks.map((w) => (
                    <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                      <p className="font-sans text-sm font-semibold tabular-nums text-[#1C1917]">{w.count}</p>
                      <div
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${Math.max(6, (w.count / growth.max) * 100)}px`,
                          background: "linear-gradient(180deg, #B76E79 0%, #8F4E58 100%)",
                          opacity: 0.25 + 0.75 * (w.count / growth.max),
                        }}
                      />
                      <p className="font-sans text-xs uppercase tracking-wider text-[#57534E]">{w.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1.5 font-sans text-xs text-[#57534E]">
                  <TrendingUp size={12} className="text-[#2D6350]" />
                  {growth.thisWeek >= growth.lastWeek
                    ? <>Up <span className="font-semibold tabular-nums text-[#1C1917]">{growth.thisWeek}</span> vs <span className="tabular-nums">{growth.lastWeek}</span> last week</>
                    : <><span className="font-semibold tabular-nums text-[#1C1917]">{growth.thisWeek}</span> so far this week, <span className="tabular-nums">{growth.lastWeek}</span> last week</>}
                </p>
              </div>

              {/* Channels */}
              <div className={`${panelClass} p-6 lg:col-span-3`} style={panelStyle}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={sectionTitle}>Channel Performance</h2>
                  <p className="font-sans text-xs text-[#57534E]">
                    Waitlist ·
                    <span className="ml-2 mr-1 inline-block h-2 w-2 rounded-sm bg-[#2D6350] align-middle" /> qualified+
                    <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-[#D8C3B8] align-middle" /> earlier
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  {channels.rows.map((ch) => (
                    <div key={ch.source} data-channel={ch.source} className="flex flex-wrap items-center gap-3">
                      <p className="w-24 shrink-0 truncate font-sans text-xs font-medium text-[#1C1917] lg:w-28">
                        {SOURCE_LABELS[ch.source] || ch.source}
                      </p>
                      <div className="flex h-6 flex-1 overflow-hidden rounded-lg bg-[#2D6350]/[0.04]">
                        <div
                          className="h-full bg-[#2D6350]"
                          style={{ width: `${(ch.quality / channels.max) * 100}%` }}
                        />
                        <div
                          className="h-full bg-[#D8C3B8]"
                          style={{ width: `${((ch.total - ch.quality) / channels.max) * 100}%` }}
                        />
                      </div>
                      <p className="w-24 shrink-0 text-right font-sans text-xs tabular-nums text-[#57534E]">
                        <span className="font-semibold text-[#1C1917]">{ch.total}</span>
                        {ch.quality > 0 && <span className="text-[#2D6350]"> · {ch.quality} qual+</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* --------------- 5. Demand by region & professional type */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Demand by region — where interest is concentrated */}
              <div className={`${panelClass} p-6 lg:col-span-3`} style={panelStyle}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={sectionTitle}>Demand by Region</h2>
                  <p className="font-sans text-xs text-[#57534E]">
                    All contacts, by region worked — one contact can count in several
                  </p>
                </div>
                {regionDemand.rows.length === 0 ? (
                  <div className="py-8 text-center">
                    <p aria-hidden="true" className="font-serif text-xl text-[#B76E79]">✦</p>
                    <p className="mt-2 font-sans text-sm text-[#57534E]">
                      No regions captured yet — the waitlist asks every new lead where they work.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 space-y-3">
                      {regionDemand.rows.map((r) => (
                        <button
                          key={r.token}
                          data-region-demand={r.token}
                          onClick={() => navigate(`/geneva/contacts?region=${r.token}`)}
                          className="group flex w-full flex-wrap items-center gap-3 py-2.5 -my-2.5 text-left"
                          aria-label={`View contacts in ${LAUNCH_REGION_SHORT_LABELS[r.token]}`}
                        >
                          <p className="w-36 shrink-0 truncate font-sans text-xs font-medium text-[#1C1917] group-hover:text-[#2D6350] lg:w-44">
                            {LAUNCH_REGION_SHORT_LABELS[r.token]}
                          </p>
                          {/* bar + count travel as one unit: beside the label at
                              normal fonts, a full-width line below it when large
                              fonts make the row too tight */}
                          <div className="flex min-w-0 flex-[1_1_8rem] items-center gap-3">
                            <div className="h-6 flex-1 overflow-hidden rounded-lg bg-[#2D6350]/[0.04]">
                              <div
                                className="h-full rounded-lg transition-all group-hover:opacity-90"
                                style={{
                                  width: `${(r.n / regionDemand.max) * 100}%`,
                                  background: "linear-gradient(90deg, #2D6350 0%, #35705B 100%)",
                                }}
                              />
                            </div>
                            <p className="w-8 shrink-0 text-right font-sans text-sm font-semibold tabular-nums text-[#1C1917]">
                              {r.n}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#1C1917]/[0.06] pt-3 font-sans text-xs text-[#57534E]">
                      <MapPin size={11} strokeWidth={2} className="text-[#8F4E58]" />
                      No region set: <span className="font-semibold tabular-nums text-[#1C1917]">{regionDemand.noRegion}</span>
                      <span className="ml-1">· click a bar to see who's there</span>
                    </p>
                  </>
                )}
              </div>

              {/* Types */}
              <div className={`${panelClass} p-6 lg:col-span-2`} style={panelStyle}>
                <h2 className={sectionTitle}>By Professional Type</h2>
                <p className="mt-1 font-sans text-xs text-[#57534E]">All contacts</p>
                <div className="mt-5 space-y-3">
                  {types.rows.map((r) => (
                    <div key={r.t} className="flex items-center gap-3">
                      <p className="w-32 shrink-0 truncate font-sans text-xs font-medium text-[#1C1917] lg:w-40">
                        {PROFESSIONAL_TYPE_LABELS[r.t] || r.t}
                      </p>
                      <div className="h-5 flex-1 overflow-hidden rounded-lg bg-[#2D6350]/[0.04]">
                        <div
                          className="h-full rounded-lg bg-gradient-to-r from-[#B76E79]/70 to-[#B76E79]/40"
                          style={{ width: `${(r.n / types.max) * 100}%` }}
                        />
                      </div>
                      <p className="w-8 shrink-0 text-right font-sans text-sm font-semibold tabular-nums text-[#1C1917]">
                        {r.n}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* --------------------------- 6. Needs attention today */}
            <div className="grid grid-cols-1">
              {/* Needs attention */}
              <div className={`${panelClass} p-6`} style={panelStyle}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className={sectionTitle}>Needs Attention Today</h2>
                  {attention.length > 0 && (
                    <Link
                      to="/geneva/contacts?view=needs_followup"
                      className="inline-flex items-center py-3.5 -my-3.5 px-2 -mx-2 font-sans text-xs font-semibold text-[#2D6350] hover:text-[#173A31]"
                    >
                      View all →
                    </Link>
                  )}
                </div>
                {attention.length === 0 ? (
                  <div className="py-8 text-center">
                    <p aria-hidden="true" className="font-serif text-xl text-[#B76E79]">✦</p>
                    <p className="mt-2 font-sans text-sm text-[#57534E]">
                      Nothing overdue and nothing due today — the book is tended.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#1C1917]/[0.06]">
                    {attention.map(({ contact, task, overdueDays }) => (
                      <li key={contact.id}>
                        <button
                          data-attention={contact.email}
                          onClick={() => navigate(`/geneva/contacts/${contact.id}`)}
                          className="group flex w-full items-center justify-between gap-3 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-sans text-sm font-semibold text-[#1C1917] group-hover:text-[#2D6350]">
                              {contact.first_name}{contact.last_name ? ` ${contact.last_name}` : ""}
                              <span className="ml-2 font-normal text-[#57534E]">
                                {PROFESSIONAL_TYPE_LABELS[contact.professional_type]}
                              </span>
                            </p>
                            <p className="truncate font-sans text-xs text-[#57534E]">"{task.title}"</p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider ${
                              overdueDays > 0
                                ? "border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.25] text-[#8F4E58]"
                                : "border-[#2D6350]/25 bg-[#2D6350]/[0.06] text-[#2D6350]"
                            }`}
                          >
                            <Hourglass size={9} strokeWidth={2.25} />
                            {overdueDays > 0 ? `${overdueDays}d overdue` : "due today"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
