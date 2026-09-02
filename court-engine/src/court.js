/**
 * The court: open cases, hold hearings, issue verdicts, write precedent.
 *
 * In production these steps are Xano custom functions, database triggers
 * (on claim insert, on verdict insert), realtime publishes, and background
 * tasks (recheck unresolved, overdue hearings, recurring-drift summaries).
 */

import * as store from "./store.js";
import { aliasIndexFromState, suggestMetric } from "./match.js";
import {
  classifyPair,
  findExplainingPrecedent,
  suggestedExplanation,
  unitsCompatible,
} from "./drift.js";
import {
  audienceScore,
  recurrenceScore,
  scoreSeverity,
  valueDiscrepancy,
} from "./severity.js";
import { nowIso, unique } from "./util.js";

const SLOTS = ["A", "B", "C", "D", "E", "F"];

function hydrateClaim(claim, state = store.getState()) {
  const source = state.sources.find((s) => s.id === claim.source_id);
  const metric = state.metrics.find((m) => m.id === claim.metric_id);
  const user = state.users.find((u) => u.name === claim.speaker);
  return {
    ...claim,
    source_type: claim.source_type || source?.type,
    source_title: claim.source_title || source?.title,
    metric_name: metric?.name,
    team_id: claim.team_id || user?.team_id,
  };
}

export function resolveMetric(query, context = {}) {
  const state = store.getState();
  return suggestMetric(query, state.metrics, aliasIndexFromState(state), context);
}

function priorCasesForMetric(metricId, excludeId) {
  return store
    .where("cases", (c) => c.metric_id === metricId && c.id !== excludeId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function definitionConflictScore(classification) {
  return classification.types.includes("definition") ? 1 : 0;
}

function scopeIncompatibilityScore(classification) {
  if (classification.types.includes("scope")) return 0.8;
  if (classification.definition?.diffs?.some((d) => d.field === "population")) return 0.8;
  return 0;
}

function nextCaseNumber() {
  const state = store.getState();
  const seq = state.meta.next_case_seq || 104;
  state.meta.next_case_seq = seq + 1;
  store.persist();
  return `MC-${seq}`;
}

function opposingTitle(metricName) {
  return `${metricName.replace(/^Customer\s+/i, "")} v. ${metricName.replace(/^Customer\s+/i, "")}`;
}

export function detectAndOpenCases(newClaimIds) {
  const state = store.getState();
  const opened = [];
  const skipped = [];
  const fresh = new Set(newClaimIds);
  const handledMetrics = new Set();

  const newClaims = newClaimIds
    .map((id) => hydrateClaim(state.claims.find((c) => c.id === id), state))
    .filter((c) => c?.metric_id);

  const byMetric = new Map();
  for (const claim of newClaims) {
    if (!byMetric.has(claim.metric_id)) byMetric.set(claim.metric_id, []);
    byMetric.get(claim.metric_id).push(claim);
  }

  for (const [metricId, cluster] of byMetric) {
    if (handledMetrics.has(metricId)) continue;
    handledMetrics.add(metricId);

    const types = new Set();
    let primaryClass = null;
    const group = [];
    const seen = new Set();

    const consider = (a, b) => {
      if (!unitsCompatible(a.unit, b.unit)) return;
      const classification = classifyPair(a, b);
      if (!classification.meaningful) return;
      classification.types.forEach((t) => types.add(t));
      if (!primaryClass) primaryClass = classification;
      for (const x of [a, b]) {
        if (seen.has(x.id)) continue;
        seen.add(x.id);
        group.push(x);
      }
    };

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) consider(cluster[i], cluster[j]);
    }

    if (group.length < 2) {
      // A single new claim can still contradict an older one (same metric + period).
      const claim = cluster[0];
      const peers = state.claims
        .filter((c) => c.metric_id === metricId && !fresh.has(c.id))
        .map((c) => hydrateClaim(c, state));
      for (const peer of peers) consider(claim, peer);
    }

    if (group.length < 2) {
      skipped.push({ metric_id: metricId, reason: "no_contradiction" });
      continue;
    }

    const metric = state.metrics.find((m) => m.id === metricId);
    const precedent = findExplainingPrecedent(
      state.precedents,
      metricId,
      primaryClass || { types: [...types] }
    );

    const values = group.map((g) => g.value).filter((v) => v != null);
    const vScore =
      values.length >= 2 ? valueDiscrepancy(Math.max(...values), Math.min(...values), group[0].unit) : 0;
    const prior = priorCasesForMetric(metricId);
    const severity = scoreSeverity({
      definitionConflict: definitionConflictScore({ types: [...types], definition: primaryClass?.definition }),
      valueDiscrepancy: vScore,
      scopeIncompatibility: scopeIncompatibilityScore(primaryClass || { types: [...types] }),
      audienceImpact: audienceScore(group),
      recurrence: recurrenceScore(prior.length),
    });

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (severity.level === "critical" ? 3 : severity.level === "high" ? 7 : 14));

    const courtCase = store.insert("cases", {
      case_number: nextCaseNumber(),
      title: opposingTitle(metric?.name || "Metric"),
      metric_id: metricId,
      status: "open",
      severity: severity.level,
      severity_score: severity.score,
      severity_components: severity.components,
      drift_types: [...types],
      suggested_explanation: suggestedExplanation(primaryClass || { types: [...types] }, metric),
      owner_id: metric?.owner_id || 1,
      deadline: deadline.toISOString().slice(0, 10),
      created_at: nowIso(),
      closed_at: null,
      resolution_hours: null,
      related_precedent_id: precedent?.id || null,
    });

    group.forEach((g, i) => {
      store.insert("case_claims", { case_id: courtCase.id, claim_id: g.id, slot: SLOTS[i] || String(i + 1) });
    });

    store.audit(0, "case.opened", "case", courtCase.id, `${courtCase.case_number} opened: ${courtCase.title}`);
    opened.push(courtCase);
  }

  return { opened, skipped };
}

export function attachEvidence(caseId, { type, title, content, submitted_by }) {
  const row = store.insert("evidence", {
    case_id: Number(caseId),
    type: type || "note",
    title,
    content,
    submitted_by: submitted_by || 1,
    created_at: nowIso(),
  });
  store.audit(submitted_by || 1, "evidence.added", "evidence", row.id, title);
  return row;
}

export function issueVerdict(caseId, payload) {
  const courtCase = store.find("cases", caseId);
  if (!courtCase) throw Object.assign(new Error("Case not found"), { status: 404 });
  if (courtCase.status === "closed" && !payload.allow_reopen) {
    throw Object.assign(new Error("Case already closed"), { status: 409 });
  }

  const state = store.getState();
  const metric = state.metrics.find((m) => m.id === courtCase.metric_id);
  const currentDef = state.metric_definitions.find((d) => d.id === metric?.current_definition_id);
  let newDef = null;
  let newAlias = null;

  const shouldAmend =
    payload.outcome === "canonical_amended" ||
    payload.outcome === "both_correct" ||
    payload.amend_definition;

  if (shouldAmend && metric) {
    const nextVersion = Math.max(0, ...state.metric_definitions.filter((d) => d.metric_id === metric.id).map((d) => d.version)) + 1;
    if (currentDef) {
      store.update("metric_definitions", currentDef.id, {
        valid_to: nowIso().slice(0, 10),
      });
    }
    newDef = store.insert("metric_definitions", {
      metric_id: metric.id,
      version: nextVersion,
      formula: payload.formula || currentDef?.formula,
      population: payload.population || "Customers eligible to return",
      calculation_type: payload.calculation_type || currentDef?.calculation_type || "Subsequent-quarter retention",
      unit: currentDef?.unit || metric.unit,
      valid_from: nowIso().slice(0, 10),
      valid_to: null,
      notes: payload.definition_notes || payload.statement,
    });
    store.update("metrics", metric.id, {
      current_definition_id: newDef.id,
      health_status: "stable",
      approved_source: payload.approved_source || metric.approved_source,
    });
  }

  if (payload.alias) {
    const exists = state.metric_aliases.some(
      (a) => a.metric_id === metric.id && a.alias.toLowerCase() === payload.alias.toLowerCase()
    );
    if (!exists) {
      newAlias = store.insert("metric_aliases", {
        metric_id: metric.id,
        alias: payload.alias,
        approved: true,
        source: `verdict:${courtCase.case_number}`,
      });
    }
  }

  const verdict = store.insert("verdicts", {
    case_id: courtCase.id,
    outcome: payload.outcome,
    statement: payload.statement,
    definition_version_created: newDef?.version || null,
    issued_by: payload.issued_by || 1,
    issued_at: nowIso(),
  });

  let precedent = null;
  if (payload.create_precedent !== false) {
    precedent = store.insert("precedents", {
      case_id: courtCase.id,
      metric_id: courtCase.metric_id,
      title: payload.precedent_title || defaultPrecedentTitle(payload.outcome, metric),
      rule: payload.precedent_rule || payload.statement,
      applies_to_drift: courtCase.drift_types || ["definition"],
      created_at: nowIso(),
    });
  }

  const closedAt = nowIso();
  const hours = (new Date(closedAt) - new Date(courtCase.created_at)) / 36e5;
  store.update("cases", courtCase.id, {
    status: "closed",
    closed_at: closedAt,
    resolution_hours: Math.round(hours * 10) / 10,
    verdict_id: verdict.id,
  });

  store.audit(
    payload.issued_by || 1,
    "verdict.issued",
    "case",
    courtCase.id,
    `${courtCase.case_number} closed. ${payload.outcome}. ${newDef ? `Definition v${newDef.version} written.` : ""}`
  );

  const reassessed = reassessOpenCases(courtCase.metric_id, courtCase.id, precedent, verdict);

  return {
    verdict,
    case: store.find("cases", courtCase.id),
    definition: newDef,
    alias: newAlias,
    precedent,
    reassessed,
  };
}

function defaultPrecedentTitle(outcome, metric) {
  if (outcome === "both_correct") {
    return `When reporting ${metric?.name || "this metric"}, state the population. Management reporting uses the named definition.`;
  }
  return `Resolution of ${metric?.name || "metric"} (${outcome})`;
}

export function reassessOpenCases(metricId, exceptCaseId, precedent, verdict) {
  const open = store.where(
    "cases",
    (c) => c.metric_id === metricId && c.id !== exceptCaseId && (c.status === "open" || c.status === "hearing")
  );
  const closed = [];
  for (const c of open) {
    const overlap = (c.drift_types || []).some((t) => (precedent?.applies_to_drift || []).includes(t));
    if (!overlap && verdict?.outcome !== "both_correct" && verdict?.outcome !== "canonical_amended") continue;
    store.update("cases", c.id, {
      status: "closed",
      closed_at: nowIso(),
      resolution_hours: Math.round(((Date.now() - new Date(c.created_at)) / 36e5) * 10) / 10,
      reassessed_from: exceptCaseId,
      suggested_explanation: `Resolved by precedent from ${store.find("cases", exceptCaseId)?.case_number}. ${precedent?.rule || verdict?.statement || ""}`,
    });
    store.audit(0, "case.reassessed", "case", c.id, `Closed against new precedent.`);
    closed.push(store.find("cases", c.id));
  }
  return closed;
}

export function fileAppeal(caseId, payload) {
  const courtCase = store.find("cases", caseId);
  if (!courtCase) throw Object.assign(new Error("Case not found"), { status: 404 });
  const verdict = store.where("verdicts", (v) => v.case_id === courtCase.id).at(-1);
  const appeal = store.insert("appeals", {
    case_id: courtCase.id,
    verdict_id: verdict?.id || null,
    reason: payload.reason,
    status: "open",
    filed_by: payload.filed_by || 1,
    created_at: nowIso(),
  });
  store.update("cases", courtCase.id, { status: "appealed" });
  store.audit(payload.filed_by || 1, "appeal.filed", "appeal", appeal.id, payload.reason);
  return appeal;
}

export function assembleCase(id) {
  const state = store.getState();
  const courtCase = state.cases.find((c) => c.id === Number(id) || c.case_number === id);
  if (!courtCase) return null;
  const links = state.case_claims.filter((cc) => cc.case_id === courtCase.id);
  const claims = links
    .map((cc) => {
      const raw = state.claims.find((c) => c.id === cc.claim_id);
      return raw ? { slot: cc.slot, ...hydrateClaim(raw, state) } : null;
    })
    .filter(Boolean);
  const metric = state.metrics.find((m) => m.id === courtCase.metric_id);
  const definitions = state.metric_definitions
    .filter((d) => d.metric_id === courtCase.metric_id)
    .sort((a, b) => a.version - b.version);
  const currentDef = definitions.find((d) => d.id === metric?.current_definition_id) || definitions.at(-1);
  const owner = state.users.find((u) => u.id === courtCase.owner_id);
  const evidence = state.evidence.filter((e) => e.case_id === courtCase.id);
  const verdicts = state.verdicts.filter((v) => v.case_id === courtCase.id);
  const precedents = state.precedents.filter(
    (p) => p.metric_id === courtCase.metric_id || p.case_id === courtCase.id
  );
  const aliases = state.metric_aliases.filter((a) => a.metric_id === courtCase.metric_id);
  const related = state.cases.filter((c) => c.metric_id === courtCase.metric_id && c.id !== courtCase.id);
  const pairwise = [];
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      pairwise.push({
        a: claims[i].slot,
        b: claims[j].slot,
        ...classifyPair(claims[i], claims[j]),
      });
    }
  }
  return {
    ...courtCase,
    metric,
    owner,
    current_definition: currentDef,
    definitions,
    aliases,
    claims,
    evidence,
    verdicts,
    precedents,
    related_cases: related,
    pairwise,
    detected_differences: unique(pairwise.flatMap((p) => p.notes)),
  };
}

export { unique };
