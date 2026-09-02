import * as store from "./store.js";
import { daysBetween } from "./util.js";

export function dashboard() {
  const state = store.getState();
  const open = state.cases.filter((c) => c.status === "open" || c.status === "hearing" || c.status === "appealed");
  const closed = state.cases.filter((c) => c.status === "closed");
  const critical = open.filter((c) => c.severity === "critical");

  const resolutionHours = closed.map((c) => c.resolution_hours).filter((n) => n != null);
  const avgHours = resolutionHours.length
    ? resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length
    : 0;

  const byMetric = new Map();
  for (const c of state.cases) {
    byMetric.set(c.metric_id, (byMetric.get(c.metric_id) || 0) + 1);
  }
  const mostDisputed = [...byMetric.entries()]
    .map(([metric_id, count]) => ({
      metric: state.metrics.find((m) => m.id === metric_id),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const defConflictsByTeam = new Map();
  for (const c of state.cases) {
    if (!(c.drift_types || []).includes("definition")) continue;
    const links = state.case_claims.filter((cc) => cc.case_id === c.id);
    for (const link of links) {
      const claim = state.claims.find((x) => x.id === link.claim_id);
      const team = state.teams.find((t) => t.id === claim?.team_id);
      if (!team) continue;
      defConflictsByTeam.set(team.name, (defConflictsByTeam.get(team.name) || 0) + 1);
    }
  }

  const driftCounts = {};
  for (const c of state.cases) {
    for (const t of c.drift_types || []) {
      driftCounts[t] = (driftCounts[t] || 0) + 1;
    }
  }

  const active = state.metrics.find((m) => m.canonical_id === "M-ACT-001");
  const activeDefs = state.metric_definitions.filter((d) => d.metric_id === active?.id).length;
  const headline =
    activeDefs >= 3
      ? `Your company currently has ${activeDefs} definitions of “Active Customer.”`
      : mostDisputed[0]
        ? `${mostDisputed[0].metric?.name} has been disputed ${mostDisputed[0].count} times.`
        : "The docket is quiet. That is usually a lie.";

  const valueDriftSeries = closed
    .concat(open)
    .map((c) => ({
      date: c.created_at.slice(0, 10),
      case_number: c.case_number,
      metric: state.metrics.find((m) => m.id === c.metric_id)?.name,
      score: c.severity_score,
      types: c.drift_types,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const overdue = open.filter((c) => c.deadline && c.deadline < new Date().toISOString().slice(0, 10));

  const teamConflict = [...defConflictsByTeam.entries()]
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count);

  return {
    headline,
    company: state.meta.company,
    generated_at: new Date().toISOString(),
    kpis: {
      open_cases: open.length,
      critical_cases: critical.length,
      avg_resolution_days: Math.round((avgHours / 24) * 10) / 10,
      most_disputed_metric: mostDisputed[0]?.metric?.name || "—",
      overdue_hearings: overdue.length,
    },
    open_cases: open
      .map((c) => summarizeCase(c, state))
      .sort((a, b) => b.severity_score - a.severity_score),
    closed_cases: closed.map((c) => summarizeCase(c, state)),
    most_disputed: mostDisputed.slice(0, 6),
    definition_conflicts_by_team: teamConflict,
    recurring_drift: driftCounts,
    value_drift_series: valueDriftSeries,
    overdue,
    registry_health: state.metrics.map((m) => ({
      ...m,
      owner: state.users.find((u) => u.id === m.owner_id),
      version: state.metric_definitions.find((d) => d.id === m.current_definition_id)?.version,
      case_count: state.cases.filter((c) => c.metric_id === m.id).length,
      open_count: open.filter((c) => c.metric_id === m.id).length,
    })),
  };
}

function summarizeCase(c, state) {
  const metric = state.metrics.find((m) => m.id === c.metric_id);
  const owner = state.users.find((u) => u.id === c.owner_id);
  const links = state.case_claims.filter((cc) => cc.case_id === c.id);
  const claims = links.map((cc) => state.claims.find((x) => x.id === cc.claim_id)).filter(Boolean);
  const age_days = Math.round(daysBetween(c.created_at, c.closed_at || new Date().toISOString()) * 10) / 10;
  return {
    ...c,
    metric_name: metric?.name,
    owner_name: owner?.name,
    claim_count: claims.length,
    values: claims.map((x) => x.value),
    age_days,
  };
}

export function driftRadar() {
  const dash = dashboard();
  return {
    headline: dash.headline,
    definition_drift_by_team: dash.definition_conflicts_by_team,
    value_drift_over_time: dash.value_drift_series,
    most_misunderstood: dash.most_disputed,
    reopened: store.where("cases", (c) => c.status === "appealed" || c.reassessed_from),
    avg_time_to_verdict_days: dash.kpis.avg_resolution_days,
    recurring_drift: dash.recurring_drift,
    open_cases: dash.kpis.open_cases,
    critical_cases: dash.kpis.critical_cases,
  };
}

export function runBackgroundPass() {
  const state = store.getState();
  const today = new Date().toISOString().slice(0, 10);
  const overdue = state.cases.filter(
    (c) => (c.status === "open" || c.status === "hearing") && c.deadline && c.deadline < today
  );
  for (const c of overdue) {
    if (c.severity === "critical") continue;
    const bumped = c.severity === "high" ? "critical" : c.severity === "review" ? "high" : "review";
    const score = Math.min(100, (c.severity_score || 40) + 8);
    store.update("cases", c.id, { severity: bumped, severity_score: score, overdue: true });
    store.audit(0, "hearing.overdue", "case", c.id, `${c.case_number} is past its hearing date.`);
  }

  const disputed = {};
  for (const c of state.cases) {
    disputed[c.metric_id] = (disputed[c.metric_id] || 0) + 1;
  }
  const chronic = Object.entries(disputed)
    .filter(([, n]) => n >= 3)
    .map(([id, n]) => {
      const metric = state.metrics.find((m) => m.id === Number(id));
      return { metric: metric?.name, cases: n };
    });

  return { overdue: overdue.length, chronic_definitions: chronic };
}
