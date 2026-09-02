/**
 * Canonical metric matching.
 *
 * Combines exact aliases, normalized text, token similarity, previously
 * approved aliases, and product/country context. Returns 0–1.
 *
 * This is a Xano custom function (`fn_metric_matching_score`) in production.
 */

import { jaccard, normalizeText, clamp, round } from "./util.js";

export function matchingScore(query, metric, aliases = []) {
  const q = normalizeText(query);
  if (!q) return 0;

  const names = [
    metric.name,
    metric.canonical_id,
    ...(aliases || []).map((a) => a.alias || a),
  ]
    .filter(Boolean)
    .map(normalizeText);

  if (names.includes(q)) return 1;

  let best = 0;
  for (const name of names) {
    if (!name) continue;
    if (name === q) return 1;
    if (name.includes(q) || q.includes(name)) {
      best = Math.max(best, 0.86);
    }
    best = Math.max(best, jaccard(q, name));
    // Light stemming: "retention" vs "retaining", "disbursed" vs "disbursement"
    const stemQ = q.replace(/(ing|ment|ed|ion|s)$/g, "");
    const stemN = name.replace(/(ing|ment|ed|ion|s)$/g, "");
    if (stemQ.length > 3 && stemN.includes(stemQ)) best = Math.max(best, 0.78);
  }

  return clamp(best);
}

export function suggestMetric(query, metrics, aliasIndex, context = {}) {
  const scored = metrics.map((metric) => {
    const aliases = aliasIndex.get(metric.id) || [];
    let score = matchingScore(query, metric, aliases);
    if (context.product && metric.default_product && context.product === metric.default_product) {
      score = Math.min(1, score + 0.04);
    }
    if (context.country && metric.default_country && context.country === metric.country) {
      score = Math.min(1, score + 0.03);
    }
    return { metric, score: round(score, 3), aliases: aliases.map((a) => a.alias) };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < 0.45) {
    return { metric: null, score: top?.score || 0, candidates: scored.slice(0, 3) };
  }
  return { metric: top.metric, score: top.score, candidates: scored.slice(0, 3) };
}

export function aliasIndexFromState(state) {
  const map = new Map();
  for (const alias of state.metric_aliases || []) {
    if (!map.has(alias.metric_id)) map.set(alias.metric_id, []);
    map.get(alias.metric_id).push(alias);
  }
  return map;
}
