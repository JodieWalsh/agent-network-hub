/**
 * ClientForm.tsx — CRM Phase 1: create a household (Client + members).
 *
 * Save chain: insert client -> insert members -> set primary_contact_member_id
 * -> write client_activities "client_created" timeline entry.
 *
 * Design: quiet luxury (CLAUDE.md) — never copy briefs styling.
 * Data access: raw fetch only; never import the supabase client.
 * App-level rule (docs/CRM_ROADMAP.md): a LIVE client requires a
 * next_action_date — enforced here in the form, NOT as a DB constraint.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface MemberDraft {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role_in_household: string;
  is_primary_contact: boolean;
}

const emptyMember = (primary: boolean): MemberDraft => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role_in_household: "other",
  is_primary_contact: primary,
});

const LIFECYCLE_OPTIONS = [
  { value: "new_enquiry", label: "New Enquiry" },
  { value: "discovery_booked", label: "Discovery Booked" },
  { value: "discovery_completed", label: "Discovery Completed" },
  { value: "engaged", label: "Engaged / Signed" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const HOUSEHOLD_TYPES = [
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family" },
  { value: "parent_child", label: "Parent & Child" },
  { value: "co_buyers", label: "Co-buyers" },
  { value: "single", label: "Single Buyer" },
  { value: "other", label: "Other" },
];

const MEMBER_ROLES = [
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "co_buyer", label: "Co-buyer" },
  { value: "other", label: "Other" },
];

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

/* Quiet-luxury field styles: fine borders, ivory-friendly, explicit colours */
const inputClass =
  "w-full rounded-xl border border-[#1C1917]/15 bg-white/90 px-4 py-2.5 font-sans text-sm text-[#1C1917] placeholder:text-[#8A8580] outline-none transition-colors focus:border-[#2D6350] focus:ring-2 focus:ring-[#2D6350]/15";
const labelClass =
  "mb-1.5 block font-sans text-xs font-medium uppercase tracking-[0.14em] text-[#57534E]";

export default function ClientForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState("couple");
  const [lifecycleStage, setLifecycleStage] = useState("new_enquiry");
  const [leadSource, setLeadSource] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [nextActionType, setNextActionType] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([emptyMember(true)]);

  const isClosedStage = lifecycleStage === "closed_won" || lifecycleStage === "closed_lost";

  const updateMember = (index: number, patch: Partial<MemberDraft>) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const setPrimary = (index: number) => {
    setMembers((prev) => prev.map((m, i) => ({ ...m, is_primary_contact: i === index })));
  };

  const addMember = () => setMembers((prev) => [...prev, emptyMember(false)]);

  const removeMember = (index: number) => {
    setMembers((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Keep exactly one primary: if the removed member was primary, promote the first
      if (next.length > 0 && !next.some((m) => m.is_primary_contact)) {
        next[0] = { ...next[0], is_primary_contact: true };
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!householdName.trim()) return "Please give the household a name.";
    if (members.length === 0) return "A household needs at least one member.";
    if (members.some((m) => !m.first_name.trim()))
      return "Every member needs at least a first name.";
    if (!members.some((m) => m.is_primary_contact))
      return "Please mark one member as the primary contact.";
    // App-level rule: live clients must have a next action (never a DB constraint)
    if (!isClosedStage && !nextActionDate)
      return "A live client needs a next action date — set one to keep follow-up discipline.";
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
    const jsonHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    let createdClientId: string | null = null;
    try {
      // 1. Insert the client (household)
      const clientRes = await fetch(`${supabaseUrl}/rest/v1/clients`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          agent_id: user.id,
          household_name: householdName.trim(),
          household_type: householdType,
          lifecycle_stage: lifecycleStage,
          lead_source: leadSource.trim() || null,
          next_action_date: nextActionDate || null,
          next_action_type: nextActionType.trim() || null,
          last_contact_at: new Date().toISOString(),
        }),
      });
      if (!clientRes.ok) throw new Error(`Client insert failed: ${clientRes.status} ${await clientRes.text()}`);
      const [client] = await clientRes.json();
      createdClientId = client.id;

      // 2. Insert members
      const memberRows = members.map((m) => ({
        client_id: client.id,
        agent_id: user.id,
        first_name: m.first_name.trim(),
        last_name: m.last_name.trim() || null,
        full_name: `${m.first_name.trim()} ${m.last_name.trim()}`.trim(),
        email: m.email.trim() || null,
        phone: m.phone.trim() || null,
        role_in_household: m.role_in_household,
        is_primary_contact: m.is_primary_contact,
      }));
      const membersRes = await fetch(`${supabaseUrl}/rest/v1/client_members`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(memberRows),
      });
      if (!membersRes.ok) throw new Error(`Members insert failed: ${membersRes.status} ${await membersRes.text()}`);
      const createdMembers: { id: string; is_primary_contact: boolean }[] = await membersRes.json();

      // 3. Point the client at its primary contact
      const primary = createdMembers.find((m) => m.is_primary_contact);
      if (primary) {
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${client.id}`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ primary_contact_member_id: primary.id }),
        });
        if (!patchRes.ok) throw new Error(`Primary contact update failed: ${patchRes.status}`);
      }

      // 4. Timeline: the household's first activity
      const activityRes = await fetch(`${supabaseUrl}/rest/v1/client_activities`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          client_id: client.id,
          agent_id: user.id,
          actor_user_id: user.id,
          event_type: "client_created",
          event_context: {
            household_name: householdName.trim(),
            member_count: members.length,
            lifecycle_stage: lifecycleStage,
          },
        }),
      });
      if (!activityRes.ok) console.error("Timeline entry failed:", await activityRes.text());

      toast.success(`${householdName.trim()} added to your client book`);
      navigate("/clients");
    } catch (error) {
      console.error("Error creating client:", error);
      // Best-effort rollback so a half-created household doesn't linger
      if (createdClientId) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${createdClientId}`, {
            method: "DELETE",
            headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
          });
        } catch (e) {}
      }
      toast.error("Could not create the client. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const panelStyle = {
    background:
      "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.8) 55%, rgba(246,241,234,0.72) 100%)",
    borderTop: "1px solid rgba(183,110,121,0.3)",
  };
  const panelClass =
    "rounded-[20px] border border-white/60 p-6 backdrop-blur-md shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16)]";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <button
          onClick={() => navigate("/clients")}
          className="mb-6 inline-flex items-center gap-2 font-sans text-sm font-medium text-[#2D6350] transition-colors hover:text-[#173A31]"
        >
          <ArrowLeft size={15} />
          Back to Clients
        </button>
        <h1 className="font-serif text-3xl font-semibold text-[#1C1917] lg:text-4xl">
          New Client
        </h1>
        <p className="mt-2 font-sans text-sm text-[#57534E]">
          Create a household case file — you can refine everything later
        </p>

        {/* Household panel */}
        <div className={`${panelClass} mt-8`} style={panelStyle}>
          <h2 className="mb-5 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
            Household
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="household_name" className={labelClass}>
                Household Name *
              </label>
              <input
                id="household_name"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g. Smith Household"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="household_type" className={labelClass}>
                Household Type
              </label>
              <select
                id="household_type"
                value={householdType}
                onChange={(e) => setHouseholdType(e.target.value)}
                className={inputClass}
              >
                {HOUSEHOLD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lifecycle_stage" className={labelClass}>
                Lifecycle Stage
              </label>
              <select
                id="lifecycle_stage"
                value={lifecycleStage}
                onChange={(e) => setLifecycleStage(e.target.value)}
                className={inputClass}
              >
                {LIFECYCLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="lead_source" className={labelClass}>
                Lead Source
              </label>
              <input
                id="lead_source"
                type="text"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                placeholder="e.g. Referral — James at Harcourt Lane"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="next_action_date" className={labelClass}>
                Next Action Date {!isClosedStage && "*"}
              </label>
              <input
                id="next_action_date"
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="next_action_type" className={labelClass}>
                Next Action
              </label>
              <input
                id="next_action_type"
                type="text"
                value={nextActionType}
                onChange={(e) => setNextActionType(e.target.value)}
                placeholder="e.g. Book discovery call"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Members panel */}
        <div className={`${panelClass} mt-6`} style={panelStyle}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6350]">
              Members
            </h2>
            <button
              onClick={addMember}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D6350]/25 bg-white/70 px-3 py-1.5 font-sans text-xs font-semibold text-[#2D6350] transition-colors hover:bg-[#2D6350]/[0.06]"
            >
              <Plus size={13} />
              Add Member
            </button>
          </div>

          <div className="space-y-5">
            {members.map((member, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[#1C1917]/[0.08] bg-white/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setPrimary(index)}
                    className={
                      member.is_primary_contact
                        ? "inline-flex items-center gap-1.5 rounded-full border border-[#B76E79]/35 bg-[#B76E79]/[0.10] px-3 py-1 font-sans text-xs font-semibold text-[#8F4E58]"
                        : "inline-flex items-center gap-1.5 rounded-full border border-[#1C1917]/15 bg-white px-3 py-1 font-sans text-xs font-medium text-[#57534E] transition-colors hover:border-[#B76E79]/35 hover:text-[#8F4E58]"
                    }
                  >
                    <Star size={12} strokeWidth={2} fill={member.is_primary_contact ? "currentColor" : "none"} />
                    {member.is_primary_contact ? "Primary Contact" : "Make Primary"}
                  </button>
                  {members.length > 1 && (
                    <button
                      onClick={() => removeMember(index)}
                      aria-label={`Remove member ${index + 1}`}
                      className="rounded-lg p-1.5 text-[#57534E] transition-colors hover:bg-[#B76E79]/10 hover:text-[#8F4E58]"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`member_${index}_first`} className={labelClass}>
                      First Name *
                    </label>
                    <input
                      id={`member_${index}_first`}
                      type="text"
                      value={member.first_name}
                      onChange={(e) => updateMember(index, { first_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`member_${index}_last`} className={labelClass}>
                      Last Name
                    </label>
                    <input
                      id={`member_${index}_last`}
                      type="text"
                      value={member.last_name}
                      onChange={(e) => updateMember(index, { last_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`member_${index}_email`} className={labelClass}>
                      Email
                    </label>
                    <input
                      id={`member_${index}_email`}
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(index, { email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`member_${index}_phone`} className={labelClass}>
                      Phone
                    </label>
                    <input
                      id={`member_${index}_phone`}
                      type="tel"
                      value={member.phone}
                      onChange={(e) => updateMember(index, { phone: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`member_${index}_role`} className={labelClass}>
                      Role in Household
                    </label>
                    <select
                      id={`member_${index}_role`}
                      value={member.role_in_household}
                      onChange={(e) => updateMember(index, { role_in_household: e.target.value })}
                      className={inputClass}
                    >
                      {MEMBER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end gap-3 pb-12">
          <button
            onClick={() => navigate("/clients")}
            disabled={saving}
            className="rounded-xl border border-[#1C1917]/15 bg-white/80 px-5 py-3 font-sans text-sm font-semibold text-[#1C1917] transition-colors hover:bg-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            id="save_client"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2D6350] px-6 py-3 font-sans text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(23,58,49,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A31] disabled:translate-y-0 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create Client"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
