/**
 * GenevaContactForm.tsx — Geneva Phase 1: add/edit a contact.
 *
 * One form for both create (/geneva/contacts/new) and edit
 * (/geneva/contacts/:id/edit). Lean v1 field set per docs/GENEVA_ROADMAP.md.
 *
 * Rules honoured here:
 *  - Raw fetch only; admin-only shared team view (no owner filtering).
 *  - Email required + must look like an email; duplicate emails blocked by
 *    the DB's case-insensitive unique index → 409 is caught and shown as a
 *    friendly inline message, never a crash.
 *  - lifecycle_stage = 'inactive' requires a reason (APP-level enforcement —
 *    the roadmap deliberately keeps this out of the DB).
 *  - On create: writes the 'contact_created' timeline entry; on edit, a
 *    stage change writes 'stage_changed'.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  GenevaContact,
  PROFESSIONAL_TYPE_LABELS,
  GENEVA_STAGE_LABELS,
  INACTIVE_REASON_LABELS,
  SOURCE_LABELS,
  CONSENT_LABELS,
  CONTACT_TYPE_LABELS,
  restHeaders,
  writeGenevaActivity,
} from "@/lib/geneva";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Draft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  professional_type: string;
  region_city: string;
  lifecycle_stage: string;
  inactive_reason: string;
  owner_id: string;
  original_source: string;
  source_detail: string;
  email_consent_status: string;
  contact_type: string;
  consent_evidence: string; // outreach → subscribed only; written to the timeline
  notes: string;
}

const emptyDraft = (ownerId: string): Draft => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company: "",
  professional_type: "buyers_agent",
  region_city: "",
  lifecycle_stage: "new",
  inactive_reason: "",
  owner_id: ownerId,
  original_source: "",
  source_detail: "",
  email_consent_status: "pending",
  contact_type: "waitlist",
  consent_evidence: "",
  notes: "",
});

/* --------------------------------------------------------------- page */

export default function GenevaContactForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<GenevaContact | null>(null);
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const headers = restHeaders();
        // Owner picker = admin profiles (Geneva is admin-only, shared view)
        const aRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?role=eq.admin&select=id,full_name&order=full_name.asc`,
          { headers }
        );
        setAdmins(aRes.ok ? await aRes.json() : []);

        if (isEdit) {
          const cRes = await fetch(
            `${supabaseUrl}/rest/v1/geneva_contacts?id=eq.${id}&select=*`,
            { headers }
          );
          const [row]: GenevaContact[] = cRes.ok ? await cRes.json() : [];
          if (row) {
            setOriginal(row);
            setDraft({
              first_name: row.first_name,
              last_name: row.last_name || "",
              email: row.email,
              phone: row.phone || "",
              company: row.company || "",
              professional_type: row.professional_type,
              region_city: row.region_city || "",
              lifecycle_stage: row.lifecycle_stage,
              inactive_reason: row.inactive_reason || "",
              owner_id: row.owner_id || "",
              original_source: row.original_source || "",
              source_detail: row.source_detail || "",
              email_consent_status: row.email_consent_status,
              contact_type: row.contact_type || "waitlist",
              consent_evidence: "",
              notes: row.notes || "",
            });
          }
        } else {
          setDraft(emptyDraft(user.id));
        }
      } catch (e) {
        console.error("Error loading Geneva form:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, id, isEdit, supabaseUrl]);

  const set = (field: keyof Draft, value: string) => {
    setDraft((d) => (d ? { ...d, [field]: value } : d));
    setErrors((e) => {
      if (!e[field] && field !== "email") return e;
      const { [field]: _gone, ...rest } = e;
      return rest;
    });
  };

  /** Outreach contacts becoming 'subscribed' need consent evidence — the
   *  transition writes the timeline paper trail the Mailchimp push demands. */
  const needsConsentEvidence = (d: Draft) =>
    d.contact_type === "interview_outreach" &&
    d.email_consent_status === "subscribed" &&
    (!original || original.email_consent_status !== "subscribed");

  const validate = (d: Draft): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!d.first_name.trim()) errs.first_name = "A first name is required.";
    if (!d.email.trim()) errs.email = "An email is required — it's how Geneva prevents duplicates.";
    else if (!EMAIL_RE.test(d.email.trim())) errs.email = "That doesn't look like an email address.";
    if (d.lifecycle_stage === "inactive" && !d.inactive_reason)
      errs.inactive_reason = "Choose why this contact is inactive — it keeps the book honest.";
    if (needsConsentEvidence(d) && !d.consent_evidence.trim())
      errs.consent_evidence =
        "Outreach contacts need recorded consent — note how it was obtained (e.g. \"confirmed by email reply, 7 Jul\").";
    return errs;
  };

  const save = async () => {
    if (!user || !draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      // Outreach contacts start their interview journey at 'to_contact'
      // (app-level rule; also covers a waitlist→outreach type switch).
      const startsInterviewJourney =
        draft.contact_type === "interview_outreach" &&
        (!original || original.contact_type !== "interview_outreach") &&
        !original?.interview_stage;

      const payload = {
        contact_type: draft.contact_type,
        ...(startsInterviewJourney
          ? { interview_stage: "to_contact", interview_stage_entered_at: new Date().toISOString() }
          : {}),
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim() || null,
        email: draft.email.trim(),
        phone: draft.phone.trim() || null,
        company: draft.company.trim() || null,
        professional_type: draft.professional_type,
        region_city: draft.region_city.trim() || null,
        lifecycle_stage: draft.lifecycle_stage,
        inactive_reason: draft.lifecycle_stage === "inactive" ? draft.inactive_reason : null,
        owner_id: draft.owner_id || null,
        original_source: draft.original_source || null,
        source_detail: draft.source_detail.trim() || null,
        email_consent_status: draft.email_consent_status,
        notes: draft.notes.trim() || null,
      };

      // The Spam-Act paper trail: outreach → subscribed writes an explicit
      // consent_changed entry (append-only timeline) that the Mailchimp
      // push REQUIRES before an outreach contact can ever be pushed.
      const writeConsentEvidence = async (contactId: string) => {
        if (!needsConsentEvidence(draft)) return;
        await writeGenevaActivity(contactId, user.id, "consent_changed", {
          from: original?.email_consent_status ?? "pending",
          to: "subscribed",
          evidence: draft.consent_evidence.trim(),
          explicit: true,
        });
      };

      if (isEdit && original) {
        const res = await fetch(`${supabaseUrl}/rest/v1/geneva_contacts?id=eq.${id}`, {
          method: "PATCH",
          headers: restHeaders(true),
          body: JSON.stringify(payload),
        });
        if (res.status === 409) {
          setErrors({ email: "A contact with this email already exists." });
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        if (payload.lifecycle_stage !== original.lifecycle_stage) {
          await writeGenevaActivity(original.id, user.id, "stage_changed", {
            from: original.lifecycle_stage,
            to: payload.lifecycle_stage,
            ...(payload.inactive_reason ? { reason: payload.inactive_reason } : {}),
          });
        }
        await writeConsentEvidence(original.id);
        toast.success("Contact updated");
      } else {
        const res = await fetch(`${supabaseUrl}/rest/v1/geneva_contacts`, {
          method: "POST",
          headers: restHeaders(true),
          body: JSON.stringify({ ...payload, created_by: user.id }),
        });
        if (res.status === 409) {
          setErrors({ email: "A contact with this email already exists." });
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const [row] = await res.json();
        await writeGenevaActivity(row.id, user.id, "contact_created", {
          professional_type: payload.professional_type,
          original_source: payload.original_source,
          ...(payload.contact_type === "interview_outreach" ? { contact_type: "interview_outreach" } : {}),
        });
        await writeConsentEvidence(row.id);
        toast.success("Contact added");
      }
      navigate("/geneva/contacts");
    } catch (e) {
      console.error(e);
      toast.error(isEdit ? "Could not update the contact." : "Could not add the contact.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !draft) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <p className="font-sans text-sm text-[#57534E]">
            {loading ? "Loading…" : "Contact not found."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const fieldError = (key: string) =>
    errors[key] ? (
      <p data-field-error={key} className="mt-1.5 font-sans text-xs text-[#8F4E58]">
        {errors[key]}
      </p>
    ) : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => navigate("/geneva/contacts")}
          className="mb-6 inline-flex items-center gap-2 font-sans text-sm font-medium text-[#2D6350] transition-colors hover:text-[#173A31]"
        >
          <ArrowLeft size={15} /> Back to Contacts
        </button>

        <div className={`${panelClass} p-6 lg:p-8`} style={panelStyle}>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#8F4E58]">
            Internal · Geneva
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1C1917]">
            {isEdit ? "Edit Contact" : "Add Contact"}
          </h1>
          <p className="mt-2 font-sans text-sm text-[#57534E]">
            {isEdit
              ? "Keep the record current — the team sees what you see."
              : "Capture them while the conversation is warm. Email is the only must."}
          </p>

          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="gc_first_name" className={labelClass}>First Name *</label>
              <input id="gc_first_name" type="text" value={draft.first_name}
                onChange={(e) => set("first_name", e.target.value)} className={inputClass} />
              {fieldError("first_name")}
            </div>
            <div>
              <label htmlFor="gc_last_name" className={labelClass}>Last Name</label>
              <input id="gc_last_name" type="text" value={draft.last_name}
                onChange={(e) => set("last_name", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="gc_email" className={labelClass}>Email *</label>
              <input id="gc_email" type="email" value={draft.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@agency.com.au" className={inputClass} />
              {fieldError("email")}
            </div>
            <div>
              <label htmlFor="gc_phone" className={labelClass}>Phone</label>
              <input id="gc_phone" type="tel" value={draft.phone}
                onChange={(e) => set("phone", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="gc_company" className={labelClass}>Company</label>
              <input id="gc_company" type="text" value={draft.company}
                onChange={(e) => set("company", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="gc_region_city" className={labelClass}>Region / City</label>
              <input id="gc_region_city" type="text" value={draft.region_city}
                onChange={(e) => set("region_city", e.target.value)}
                placeholder="e.g. Brisbane" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="gc_contact_type" className={labelClass}>Contact Type</label>
              <select id="gc_contact_type" value={draft.contact_type}
                onChange={(e) => set("contact_type", e.target.value)} className={inputClass}>
                {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {draft.contact_type === "interview_outreach" && (
                <p data-outreach-note className="mt-1.5 font-sans text-xs leading-relaxed text-[#8F4E58]">
                  Outreach contacts haven't opted in — they won't be emailed or pushed
                  to Mailchimp until consent is explicitly recorded here.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="gc_professional_type" className={labelClass}>Professional Type</label>
              <select id="gc_professional_type" value={draft.professional_type}
                onChange={(e) => set("professional_type", e.target.value)} className={inputClass}>
                {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gc_owner" className={labelClass}>Owner</label>
              <select id="gc_owner" value={draft.owner_id}
                onChange={(e) => set("owner_id", e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}{a.id === user?.id ? " (you)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gc_lifecycle_stage" className={labelClass}>Lifecycle Stage</label>
              <select id="gc_lifecycle_stage" value={draft.lifecycle_stage}
                onChange={(e) => set("lifecycle_stage", e.target.value)} className={inputClass}>
                {Object.entries(GENEVA_STAGE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gc_consent" className={labelClass}>Email Consent</label>
              <select id="gc_consent" value={draft.email_consent_status}
                onChange={(e) => set("email_consent_status", e.target.value)} className={inputClass}>
                {Object.entries(CONSENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <p className="mt-1.5 font-sans text-xs text-[#57534E]">
                Only subscribed contacts are ever pushed to Mailchimp.
              </p>
            </div>
            {needsConsentEvidence(draft) && (
              <div className="sm:col-span-2 rounded-xl border border-[#D8C3B8]/70 bg-[#D8C3B8]/[0.18] p-4">
                <label htmlFor="gc_consent_evidence" className={labelClass}>
                  How was consent obtained? *
                </label>
                <input
                  id="gc_consent_evidence"
                  type="text"
                  value={draft.consent_evidence}
                  onChange={(e) => set("consent_evidence", e.target.value)}
                  placeholder='e.g. "Replied yes to our intro email, 7 Jul" or "Asked to stay on the list during our call"'
                  className={inputClass}
                />
                {fieldError("consent_evidence")}
                <p className="mt-1.5 font-sans text-xs text-[#8F4E58]">
                  This is written to the contact's timeline as the consent record —
                  the Mailchimp push requires it for outreach contacts.
                </p>
              </div>
            )}
            {draft.lifecycle_stage === "inactive" && (
              <div className="sm:col-span-2">
                <label htmlFor="gc_inactive_reason" className={labelClass}>Inactive Reason *</label>
                <select id="gc_inactive_reason" value={draft.inactive_reason}
                  onChange={(e) => set("inactive_reason", e.target.value)} className={inputClass}>
                  <option value="">Choose a reason…</option>
                  {Object.entries(INACTIVE_REASON_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {fieldError("inactive_reason")}
              </div>
            )}
            <div>
              <label htmlFor="gc_source" className={labelClass}>Original Source</label>
              <select id="gc_source" value={draft.original_source}
                onChange={(e) => set("original_source", e.target.value)} className={inputClass}>
                <option value="">Not recorded</option>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gc_source_detail" className={labelClass}>Source Detail</label>
              <input id="gc_source_detail" type="text" value={draft.source_detail}
                onChange={(e) => set("source_detail", e.target.value)}
                placeholder="e.g. Commented on the auction-tactics reel" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="gc_notes" className={labelClass}>Notes</label>
              <textarea id="gc_notes" rows={3} value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="e.g. Met at the Sydney PropTech meetup — keen but waiting on licensing."
                className={inputClass} />
            </div>
          </div>

          <div className="mt-7 flex justify-end gap-3 border-t border-[#1C1917]/[0.06] pt-6">
            <button
              onClick={() => navigate("/geneva/contacts")}
              className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-5 py-2.5 font-sans text-sm font-semibold text-[#1C1917] hover:bg-white"
            >
              Cancel
            </button>
            <button id="gc_save" onClick={save} disabled={busy} className={primaryBtn}>
              <Check size={15} />
              {isEdit ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
