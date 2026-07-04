/**
 * stage-age.ts — CRM Phase 4: stage-age nudge logic ("in this stage a while").
 *
 * Pure, read-only helpers shared by Clients.tsx (list rows, board cards, the
 * "Stalling" saved-view chip) and ClientDetail.tsx (inline summary nudge).
 * No I/O, no writes — decides only whether a household has sat still long
 * enough to deserve a gentle nudge.
 */

/**
 * Days in a lifecycle stage before a gentle nudge. Adjust freely — this is
 * the single source of truth for all stage-age nudges.
 *
 * closed_won / closed_lost are intentionally absent: finished business never
 * nudges. For ENGAGED households with a buying stage, the clock measures time
 * since the buying stage last moved (buying_stage_entered_at), not time since
 * engagement — a household actively progressing through inspections shouldn't
 * be called stalling just for having been signed a month ago.
 */
export const STAGE_AGE_THRESHOLD_DAYS: Record<string, number> = {
  new_enquiry: 7,
  discovery_booked: 14,
  discovery_completed: 10,
  engaged: 30,
};

/** The client fields the nudge decision needs (subset of both pages' rows). */
export interface StageAgeInput {
  lifecycle_stage: string;
  buying_stage: string | null;
  client_status: string;
  stage_entered_at: string | null;
  buying_stage_entered_at: string | null;
}

export interface StageAge {
  /** Past threshold — show the gentle nudge. */
  stalling: boolean;
  /** Whole days in the measured stage (null when no timestamp exists). */
  days: number | null;
  /** Token of the stage the clock measured. */
  stage: string;
  /** Which label map the caller should use for `stage`. */
  layer: "lifecycle" | "buying";
}

function wholeDaysSince(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Decide whether a household is stalling in its current stage.
 * Degrades gracefully: closed/non-active clients, stages without a threshold,
 * and missing timestamps all return { stalling: false }.
 */
export function getStageAge(client: StageAgeInput): StageAge {
  const measureBuying =
    client.lifecycle_stage === "engaged" &&
    !!client.buying_stage &&
    !!client.buying_stage_entered_at;

  const stage = measureBuying ? (client.buying_stage as string) : client.lifecycle_stage;
  const layer: StageAge["layer"] = measureBuying ? "buying" : "lifecycle";
  const days = wholeDaysSince(
    measureBuying ? client.buying_stage_entered_at : client.stage_entered_at
  );

  const closed =
    client.lifecycle_stage === "closed_won" ||
    client.lifecycle_stage === "closed_lost" ||
    client.client_status !== "active";
  const threshold = STAGE_AGE_THRESHOLD_DAYS[client.lifecycle_stage];

  const stalling = !closed && threshold !== undefined && days !== null && days > threshold;
  return { stalling, days, stage, layer };
}
