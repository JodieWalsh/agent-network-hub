/**
 * geneva.ts — shared types, labels, and fetch helpers for GENEVA,
 * Buyers Agent Hub's INTERNAL customer CRM (docs/GENEVA_ROADMAP.md).
 *
 * Geneva is NOT Monaco: it tracks BAH's own prospects/customers (the buyers
 * agents themselves), is ADMIN-ONLY with a shared team view (RLS enforces
 * is_admin — no agent_id filtering anywhere), and uses its own geneva_*
 * tables. Raw fetch only — never import the supabase client.
 */

/* ------------------------------------------------------------------ types */

export interface GenevaContact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  professional_type: string;
  region_city: string | null;
  lifecycle_stage: string;
  inactive_reason: string | null;
  owner_id: string | null;
  original_source: string | null;
  source_detail: string | null;
  email_consent_status: string;
  notes: string | null;
  /** 'waitlist' = opted in themselves; 'interview_outreach' = WE reached out —
   *  never Mailchimp-pushed without explicit RECORDED consent (AU Spam Act). */
  contact_type: string;
  /** Interview Funnel stage — interview_outreach contacts only; NULL for waitlist. */
  interview_stage: string | null;
  interview_stage_entered_at: string | null;
  launch_regions: string[] | null; // tokens from LAUNCH_REGION_LABELS (waitlist multi-select)
  created_by: string | null; // null = created by the public landing-page intake
  mailchimp_status: string | null; // 'synced' | 'error' | null = never pushed
  mailchimp_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenevaNote {
  id: string;
  contact_id: string;
  body: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GenevaTask {
  id: string;
  contact_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_by: string;
  created_at: string;
}

export interface GenevaActivity {
  id: string;
  contact_id: string;
  actor_user_id: string | null;
  event_type: string;
  event_context: Record<string, unknown> | null;
  created_at: string;
}

/* ----------------------------------------------------------------- labels */

export const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
  building_and_pest_inspector: "Building and Pest Inspector",
  stylist: "Stylist",
};

export const GENEVA_STAGE_LABELS: Record<string, string> = {
  new: "New",
  engaged: "Engaged",
  qualified: "Qualified",
  nurturing: "Nurturing",
  trial_early_access: "Trial / Early Access",
  active_customer: "Active Customer",
  inactive: "Inactive",
};

export const INACTIVE_REASON_LABELS: Record<string, string> = {
  not_interested: "Not interested",
  wrong_professional_type: "Wrong professional type",
  no_response: "No response",
  outside_target_market: "Outside target market",
  duplicate: "Duplicate",
  not_ready_yet: "Not ready yet",
  other: "Other",
};

export const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  referral: "Referral",
  direct: "Direct",
  podcast: "Podcast",
  event: "Event",
  partner: "Partner",
  manual_import: "Manual Import",
  other: "Other",
};

/** Launch-region controlled vocabulary (waitlist Stage 1 capture).
 *  Tokens must stay in lockstep with the geneva_contacts.launch_regions
 *  CHECK constraint and the geneva-lead-intake whitelist. */
export const LAUNCH_REGION_LABELS: Record<string, string> = {
  greater_sydney: "Greater Sydney (incl. Blue Mountains, Central Coast & Wollongong)",
  greater_melbourne: "Greater Melbourne",
  seq: "South East Queensland (Gold Coast, Brisbane & Sunshine Coast)",
  greater_perth: "Greater Perth",
  uk: "United Kingdom",
  us: "United States",
  other: "Other / somewhere else",
};

/** Short region names for chips/bars/tags (the long waitlist labels don't
 *  fit filter UI). Same tokens; same order as LAUNCH_REGION_LABELS. */
export const LAUNCH_REGION_SHORT_LABELS: Record<string, string> = {
  greater_sydney: "Greater Sydney",
  greater_melbourne: "Greater Melbourne",
  seq: "South East Queensland",
  greater_perth: "Greater Perth",
  uk: "United Kingdom",
  us: "United States",
  other: "Other",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  waitlist: "Waitlist",
  interview_outreach: "Interview outreach",
};

/** Interview Funnel — the 7-step journey (9 stage tokens) in travel order.
 *  Side exits live in INTERVIEW_EXIT_LABELS. Outreach contacts only. */
export const INTERVIEW_STAGE_LABELS: Record<string, string> = {
  to_contact: "To Contact",
  intro_email_sent: "Intro Email Sent",
  call_made: "Call Made",
  interview_booked: "Interview Booked",
  questions_sent: "Questions Sent",
  reminder_sent: "Reminder Sent",
  interviewed: "Interviewed",
  thanked: "Thanked",
  clips_sent: "Clips Sent",
};

export const INTERVIEW_EXIT_LABELS: Record<string, string> = {
  declined: "Declined",
  declined_kept_on_list: "Declined — keep on list",
};

/** Every interview-stage token → label (steps + exits), for badges/timeline. */
export const ALL_INTERVIEW_STAGE_LABELS: Record<string, string> = {
  ...INTERVIEW_STAGE_LABELS,
  ...INTERVIEW_EXIT_LABELS,
};

export const CONSENT_LABELS: Record<string, string> = {
  pending: "Pending",
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Complained",
};

/* -------------------------------------------------------- fetch helpers */

export function getAuthHeaders() {
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

export function restHeaders(json = false) {
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

/**
 * Push a contact to Mailchimp via the geneva-mailchimp-push edge function
 * (Geneva Phase 3). Explicit-button-only — never call automatically.
 * The function re-verifies admin + 'subscribed' consent server-side; this
 * helper just relays its { ok, reason?, synced_at? } response.
 */
export async function pushToMailchimp(
  contactId: string
): Promise<{ ok: boolean; reason?: string; synced_at?: string }> {
  try {
    const { supabaseUrl, supabaseKey, accessToken } = getAuthHeaders();
    const res = await fetch(`${supabaseUrl}/functions/v1/geneva-mailchimp-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ contactId }),
    });
    const data = await res.json().catch(() => null);
    return data && typeof data.ok === "boolean" ? data : { ok: false };
  } catch (e) {
    console.error("Mailchimp push failed:", e);
    return { ok: false };
  }
}

/** Write a geneva_activities timeline entry (append-only; fire-and-forget). */
export async function writeGenevaActivity(
  contactId: string,
  actorUserId: string,
  eventType: string,
  eventContext: Record<string, unknown>
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  await fetch(`${supabaseUrl}/rest/v1/geneva_activities`, {
    method: "POST",
    headers: restHeaders(true),
    body: JSON.stringify({
      contact_id: contactId,
      actor_user_id: actorUserId,
      event_type: eventType,
      event_context: eventContext,
    }),
  }).catch((e) => console.error("Geneva timeline write failed:", e));
}
