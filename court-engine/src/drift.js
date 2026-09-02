/**
 * Deterministic drift classification.
 *
 * This is not ML data drift. It is semantic and organizational metric drift.
 *
 * 1. Value drift      — same metric, period, definition; different numbers
 * 2. Definition drift — same name, different formulas / populations
 * 3. Time drift       — different cut-off dates or periods
 * 4. Scope drift      — country, product, segment, stage
 * 5. Status drift     — approved vs completed, forecast vs actual
 * 6. Source drift     — different dashboards or queries treated as authoritative
 *
 * Xano custom functions: period compatibility, scope overlap, value difference.
 */

import { normalizeText, relativeDifference, round } from "./util.js";

export const DRIFT_TYPES = [
  "value",
  "definition",
  "time",
  "scope",
  "status",
  "source",
];

const PERIOD_ALIASES = {
  "last quarter": "Q2 2026",
  "this quarter": "Q3 2026",
  q2: "Q2 2026",
  "q2 2026": "Q2 2026",
  "q1 2026": "Q1 2026",
  "q3 2026": "Q3 2026",
};

export function normalizePeriod(period) {
  if (!period) return null;
  const key = normalizeText(period);
  return PERIOD_ALIASES[key] || period.trim();
}

export function periodsCompatible(a, b) {
  const pa = normalizePeriod(a);
  const pb = normalizePeriod(b);
  if (!pa || !pb) return { compatible: true, identical: !pa && !pb, reason: "period unspecified" };
  if (pa === pb) return { compatible: true, identical: true, reason: "identical period" };
  const fuzzy = (x) => normalizeText(x).replace(/\s+/g, "");
  if (fuzzy(pa) === fuzzy(pb)) return { compatible: true, identical: true, reason: "identical period" };
  if ((pa === "month-end" && pb === "today") || (pb === "month-end" && pa === "today")) {
    return { compatible: false, identical: false, reason: "month-end vs today" };
  }
  return { compatible: false, identical: false, reason: `${pa} vs ${pb}` };
}

export function scopeOverlap(a, b) {
  const fields = ["country", "product", "population", "segment"];
  const diffs = [];
  for (const f of fields) {
    const av = a[f] || null;
    const bv = b[f] || null;
    if (!av || !bv) continue;
    if (normalizeText(av) !== normalizeText(bv)) {
      diffs.push({ field: f, a: av, b: bv });
    }
  }
  if (!diffs.length) return { overlap: 1, compatible: true, diffs };
  const geoProduct = diffs.filter((d) => d.field === "country" || d.field === "product");
  const score = 1 - diffs.length / fields.length;
  return {
    overlap: round(score, 2),
    compatible: geoProduct.length === 0,
    diffs,
  };
}

export function definitionsDiffer(a, b) {
  const keys = ["calculation_type", "population", "formula"];
  const diffs = [];
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (av && bv && normalizeText(av) !== normalizeText(bv)) {
      diffs.push({ field: k, a: av, b: bv });
    }
  }
  return { different: diffs.length > 0, diffs };
}

export function sourcesDiffer(a, b) {
  const as = a.source_type || a.source_title;
  const bs = b.source_type || b.source_title;
  if (!as || !bs) return false;
  return normalizeText(as) !== normalizeText(bs);
}

export function classifyPair(a, b) {
  const types = [];
  const notes = [];

  const period = periodsCompatible(a.period, b.period);
  if (!period.identical && !period.compatible) {
    types.push("time");
    notes.push(`Time drift: ${period.reason}.`);
  }

  const def = definitionsDiffer(a, b);
  if (def.different) {
    types.push("definition");
    notes.push(
      `Definition drift: ${def.diffs.map((d) => `${d.field} (${d.a} vs ${d.b})`).join("; ")}.`
    );
  }

  const scope = scopeOverlap(a, b);
  const scopeOnly = scope.diffs.filter((d) => d.field === "country" || d.field === "product" || d.field === "segment");
  if (scopeOnly.length) {
    types.push("scope");
    notes.push(
      `Scope drift: ${scopeOnly.map((d) => `${d.field} (${d.a} vs ${d.b})`).join("; ")}.`
    );
  }

  const statusA = a.status || "actual";
  const statusB = b.status || "actual";
  if (statusA !== statusB) {
    types.push("status");
    notes.push(`Status drift: ${statusA} vs ${statusB}.`);
  }

  if (sourcesDiffer(a, b)) {
    types.push("source");
    notes.push(
      `Source drift: ${a.source_title || a.source_type} vs ${b.source_title || b.source_type}.`
    );
  }

  const samePeriod = period.identical || period.compatible;
  const sameDef = !def.different;
  const sameScope = scopeOnly.length === 0;
  const valueDiffers =
    a.value != null && b.value != null && Math.abs(a.value - b.value) > 1e-6;

  if (valueDiffers && samePeriod && sameDef && sameScope) {
    types.push("value");
    notes.push(
      `Value drift: ${a.value} vs ${b.value} (${round(relativeDifference(a.value, b.value) * 100, 1)}% relative).`
    );
  } else if (valueDiffers && !types.includes("value") && samePeriod) {
    // Conflicting numbers still matter even when a definition explains them.
    types.unshift("value");
    notes.unshift(`Reported values differ: ${formatValue(a)} vs ${formatValue(b)}.`);
  }

  const meaningful = types.length > 0 && valueDiffers;
  return {
    types: [...new Set(types)],
    notes,
    meaningful,
    period,
    definition: def,
    scope,
    value_relative: round(relativeDifference(a.value, b.value), 3),
  };
}

function formatValue(c) {
  if (c.unit === "percentage") return `${c.value}%`;
  if (c.unit === "usd") {
    if (c.value >= 1_000_000) return `$${(c.value / 1_000_000).toFixed(1)}M`;
    return `$${c.value}`;
  }
  return String(c.value);
}

export function unitsCompatible(a, b) {
  if (!a || !b) return true;
  if (a === b) return true;
  const money = new Set(["usd", "currency", "money"]);
  return money.has(a) && money.has(b);
}

/**
 * Find an existing precedent that already explains this disagreement.
 */
export function findExplainingPrecedent(precedents, metricId, classification) {
  const types = new Set(classification.types);
  return (precedents || [])
    .filter((p) => p.metric_id === metricId)
    .find((p) => {
      const applies = (p.applies_to_drift || p.drift_types || []).some((t) => types.has(t));
      const text = `${p.rule || ""} ${p.title || ""}`.toLowerCase();
      const mentions =
        (types.has("definition") && /eligib|cohort|definition|formula/.test(text)) ||
        (types.has("scope") && /country|product|region|scope/.test(text)) ||
        (types.has("status") && /approved|disbursed|status/.test(text)) ||
        (types.has("time") && /cut-off|period|month-end/.test(text));
      return applies || mentions;
    });
}

export function suggestedExplanation(classification, metric) {
  const types = classification.types;
  if (types.includes("definition")) {
    return `Definition mismatch on ${metric?.name || "this metric"}. Neither claim is inherently incorrect until the canonical population and formula are specified.`;
  }
  if (types.includes("scope")) {
    return "The values cover different countries, products, or segments. Confirm the reporting scope before treating either number as company-wide.";
  }
  if (types.includes("time")) {
    return "The values represent different cut-off dates or periods.";
  }
  if (types.includes("status")) {
    return "One figure is a pipeline or approved value; the other is completed or actual.";
  }
  if (types.includes("source")) {
    return "Different dashboards or queries are being treated as authoritative.";
  }
  if (types.includes("value")) {
    return "Same metric, period and definition — but different numbers. Trace both queries to the approved source.";
  }
  return "Conflicting claims were detected.";
}
