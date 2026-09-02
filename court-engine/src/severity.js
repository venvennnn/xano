/**
 * Deterministic case-severity score.
 *
 *   P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R
 *
 * D definition conflict, V value discrepancy, S scope incompatibility,
 * A audience impact, R recurrence. Result is 0–100.
 *
 * This is a Xano custom function in the production architecture.
 * An LLM must not assign severity.
 */

import { clamp, round } from "./util.js";

export const WEIGHTS = { D: 0.3, V: 0.25, S: 0.15, A: 0.15, R: 0.15 };

/** 9 percentage points → ~0.63, matching the product spec example. */
const PERCENT_FULL_GAP = 14.3;

export function valueDiscrepancy(a, b, unit = "percentage") {
  if (a == null || b == null) return 0;
  const abs = Math.abs(a - b);
  if (unit === "percentage" || unit === "pp") {
    return clamp(abs / PERCENT_FULL_GAP);
  }
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return clamp(abs / denom / 0.15);
}

export function recurrenceScore(priorCaseCount) {
  // Three disputes (including current) → 0.75. Four or more → 1.00.
  return clamp((Number(priorCaseCount) + 1) * 0.25);
}

export function audienceScore(claims = []) {
  const blob = claims
    .map((c) => `${c.speaker || ""} ${c.source_type || ""} ${c.source_title || ""} ${c.audience || ""}`)
    .join(" ")
    .toLowerCase();
  if (/(board|executive|management meeting|c-suite|ceo|cfo|country manager)/.test(blob)) return 1;
  if (/(head of|director|steward|owner)/.test(blob)) return 0.8;
  if (/(slack|chat|standup)/.test(blob)) return 0.4;
  if (/(analyst|notes|query)/.test(blob)) return 0.3;
  return 0.55;
}

export function priorityLevel(score) {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "review";
  return "informational";
}

export function scoreSeverity({
  definitionConflict = 0,
  valueDiscrepancy: V = 0,
  scopeIncompatibility = 0,
  audienceImpact = 0,
  recurrence = 0,
} = {}) {
  const D = clamp(definitionConflict);
  const v = clamp(V);
  const S = clamp(scopeIncompatibility);
  const A = clamp(audienceImpact);
  const R = clamp(recurrence);
  const p = WEIGHTS.D * D + WEIGHTS.V * v + WEIGHTS.S * S + WEIGHTS.A * A + WEIGHTS.R * R;
  const score = Math.round(p * 100);
  return {
    score,
    level: priorityLevel(score),
    components: {
      definition_conflict: round(D, 2),
      value_discrepancy: round(v, 2),
      scope_incompatibility: round(S, 2),
      audience_impact: round(A, 2),
      recurrence: round(R, 2),
    },
    formula: "P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R",
  };
}
