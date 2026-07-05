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
import { useNavigate } from "react-router-dom";
import { Plus, Landmark, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GenevaContact,
  PROFESSIONAL_TYPE_LABELS,
  GENEVA_STAGE_LABELS,
  SOURCE_LABELS,
  CONSENT_LABELS,
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
    <span className="inline-flex items-center gap-1.5 font-sans text-[11px] text-[#57534E]">
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
  const [contacts, setContacts] = useState<GenevaContact[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const headers = restHeaders();
        // Shared team view: ALL contacts, newest first. RLS = admin-only.
        const res = await fetch(
          `${supabaseUrl}/rest/v1/geneva_contacts?select=*&order=created_at.desc`,
          { headers }
        );
        const rows: GenevaContact[] = res.ok ? await res.json() : [];
        setContacts(rows);

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

  const subtitleCounts = useMemo(() => {
    const subscribed = contacts.filter((c) => c.email_consent_status === "subscribed").length;
    return { total: contacts.length, subscribed };
  }, [contacts]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8F4E58]">
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
        ) : (
          /* -------------------------------------------------------- list */
          <div className={`${panelClass} overflow-hidden`} style={panelStyle}>
            {/* Column headings (desktop) */}
            <div className="hidden border-b border-[#1C1917]/[0.06] px-6 py-3 lg:grid lg:grid-cols-[2.4fr_1.2fr_1.4fr_1fr_1.2fr] lg:gap-4">
              {["Contact", "Type", "Stage", "Source", "Owner · Added"].map((h) => (
                <p key={h} className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534E]">
                  {h}
                </p>
              ))}
            </div>

            <ul className="divide-y divide-[#1C1917]/[0.06]">
              {contacts.map((c) => {
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
                          <span className="truncate">{name}</span>
                          <ChevronRight size={13} className="shrink-0 text-[#8F4E58] opacity-0 transition-opacity group-hover:opacity-70" />
                        </p>
                        <p className="truncate font-sans text-xs text-[#57534E]">{meta}</p>
                      </div>
                      {/* Type */}
                      <div>
                        <TypeBadge type={c.professional_type} />
                      </div>
                      {/* Stage + consent */}
                      <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
                        <StageBadge stage={c.lifecycle_stage} />
                        <ConsentDot status={c.email_consent_status} />
                      </div>
                      {/* Source */}
                      <div className="min-w-0">
                        <p className="font-sans text-sm text-[#1C1917]">
                          {c.original_source ? SOURCE_LABELS[c.original_source] || c.original_source : "—"}
                        </p>
                        {c.source_detail && (
                          <p className="truncate font-sans text-xs text-[#57534E]">{c.source_detail}</p>
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
