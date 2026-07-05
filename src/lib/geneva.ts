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
  created_by: string;
  created_at: string;
  updated_at: string;
}

/* ----------------------------------------------------------------- labels */

export const PROFESSIONAL_TYPE_LABELS: Record<string, string> = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
  building_inspector: "Building Inspector",
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
