/**
 * Local Xano-compatible court runtime.
 *
 * The React frontend talks to these routes the same way it will talk to Xano:
 *
 *   POST /sources/analyze
 *   POST /claims
 *   GET  /claims/:id
 *   GET  /metrics
 *   POST /metrics
 *   GET  /metrics/:id
 *   GET  /metrics/:id/history
 *   GET  /cases
 *   GET  /cases/:id
 *   POST /cases/:id/evidence
 *   POST /cases/:id/verdict
 *   POST /cases/:id/appeal
 *   GET  /precedents
 *   GET  /dashboard/drift
 *
 * Xano is not storing Metric Court's output. Xano is the workflow, rules
 * engine, audit system, API layer, realtime case manager and host.
 * This process is the local stand-in so the killer demo runs without an
 * instance, and the XanoScript in /xano is the production translation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import * as store from "./store.js";
import { extractWithOptionalLlm, listDemos, DEMO_TRANSCRIPTS } from "./extract.js";
import * as court from "./court.js";
import { dashboard, driftRadar, runBackgroundPass } from "./dashboard.js";
import { nowIso } from "./util.js";

store.load();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  if (req.url === "/api" || req.url.startsWith("/api/") || req.url.startsWith("/api?")) {
    req.url = req.url.replace(/^\/api/, "") || "/";
  }
  next();
});

const clients = new Set();

function publish(event, payload) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(frame);
}

function ok(res, data) {
  res.json(data);
}

function fail(res, err) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || String(err) });
}

function speakerUser(name) {
  const state = store.getState();
  return state.users.find((u) => u.name === name || (name && u.title?.includes(name)));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, engine: "metric-court", company: store.getState().meta.company });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`);
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

app.get("/users", (_req, res) => ok(res, store.getState().users));
app.get("/teams", (_req, res) => ok(res, store.getState().teams));
app.get("/audit", (_req, res) => ok(res, [...store.getState().audit_events].reverse().slice(0, 80)));
app.get("/demos", (_req, res) => ok(res, listDemos()));

app.get("/dashboard/drift", (_req, res) => ok(res, driftRadar()));
app.get("/dashboard", (_req, res) => ok(res, dashboard()));

app.get("/metrics", (_req, res) => {
  const state = store.getState();
  ok(
    res,
    state.metrics.map((m) => ({
      ...m,
      owner: state.users.find((u) => u.id === m.owner_id),
      current_definition: state.metric_definitions.find((d) => d.id === m.current_definition_id),
      aliases: state.metric_aliases.filter((a) => a.metric_id === m.id),
      cases: state.cases.filter((c) => c.metric_id === m.id).length,
      open_cases: state.cases.filter((c) => c.metric_id === m.id && c.status !== "closed").length,
    }))
  );
});

app.post("/metrics", (req, res) => {
  const row = store.insert("metrics", {
    canonical_id: req.body.canonical_id,
    name: req.body.name,
    owner_id: req.body.owner_id || 1,
    approved_source: req.body.approved_source || "",
    health_status: "watch",
    unit: req.body.unit || "percentage",
    default_country: req.body.country || "Malaysia",
    default_product: req.body.product || "All products",
    current_definition_id: null,
  });
  ok(res, row);
});

app.get("/metrics/:id/history", (req, res) => {
  const metric = store.find("metrics", req.params.id) ||
    store.getState().metrics.find((m) => m.canonical_id === req.params.id);
  if (!metric) return fail(res, Object.assign(new Error("Metric not found"), { status: 404 }));
  const defs = store.where("metric_definitions", (d) => d.metric_id === metric.id);
  ok(res, { metric, definitions: defs });
});

app.get("/metrics/:id", (req, res) => {
  const state = store.getState();
  const metric =
    state.metrics.find((m) => String(m.id) === req.params.id || m.canonical_id === req.params.id);
  if (!metric) return fail(res, Object.assign(new Error("Metric not found"), { status: 404 }));
  ok(res, {
    ...metric,
    owner: state.users.find((u) => u.id === metric.owner_id),
    current_definition: state.metric_definitions.find((d) => d.id === metric.current_definition_id),
    definitions: state.metric_definitions.filter((d) => d.metric_id === metric.id),
    aliases: state.metric_aliases.filter((a) => a.metric_id === metric.id),
    cases: state.cases.filter((c) => c.metric_id === metric.id),
    precedents: state.precedents.filter((p) => p.metric_id === metric.id),
  });
});

app.get("/claims/:id", (req, res) => {
  const claim = store.find("claims", req.params.id);
  if (!claim) return fail(res, Object.assign(new Error("Claim not found"), { status: 404 }));
  ok(res, claim);
});

app.post("/claims", (req, res) => {
  try {
    const body = req.body;
    const resolved = court.resolveMetric(body.metric || body.metric_name, {
      product: body.product,
      country: body.country,
    });
    const claim = store.insert("claims", {
      metric_id: resolved.metric?.id || body.metric_id || null,
      matching_score: resolved.score,
      source_id: body.source_id || null,
      speaker: body.speaker,
      value: body.value,
      unit: body.unit || "percentage",
      period: body.period,
      country: body.country || "Malaysia",
      product: body.product || "All products",
      population: body.population,
      calculation_type: body.calculation_type,
      status: body.status || "actual",
      raw_excerpt: body.raw_excerpt || "",
      source_type: body.source_type,
      source_title: body.source_title,
      created_at: nowIso(),
      team_id: speakerUser(body.speaker)?.team_id,
    });
    const { opened } = court.detectAndOpenCases([claim.id]);
    publish("claim.inserted", { claim, opened });
    if (opened.length) publish("case.opened", { cases: opened });
    publish("dashboard.recalculated", dashboard());
    ok(res, { claim, match: resolved, cases_opened: opened });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/cases", (req, res) => {
  const status = req.query.status;
  const items = store
    .getState()
    .cases.filter((c) => (status ? c.status === status : true))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  ok(res, items.map((c) => court.assembleCase(c.id)));
});

app.get("/cases/:id", (req, res) => {
  const assembled = court.assembleCase(req.params.id);
  if (!assembled) return fail(res, Object.assign(new Error("Case not found"), { status: 404 }));
  ok(res, assembled);
});

app.post("/cases/:id/evidence", (req, res) => {
  try {
    const row = court.attachEvidence(req.params.id, req.body);
    publish("evidence.added", { case_id: Number(req.params.id), evidence: row });
    ok(res, row);
  } catch (err) {
    fail(res, err);
  }
});

app.post("/cases/:id/verdict", (req, res) => {
  try {
    const result = court.issueVerdict(req.params.id, req.body);
    publish("verdict.issued", result);
    publish("dashboard.recalculated", dashboard());
    ok(res, result);
  } catch (err) {
    fail(res, err);
  }
});

app.post("/cases/:id/appeal", (req, res) => {
  try {
    const appeal = court.fileAppeal(req.params.id, req.body);
    publish("appeal.filed", { appeal });
    ok(res, appeal);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/precedents", (_req, res) => {
  const state = store.getState();
  ok(
    res,
    state.precedents
      .map((p) => ({
        ...p,
        metric: state.metrics.find((m) => m.id === p.metric_id),
        case: state.cases.find((c) => c.id === p.case_id),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  );
});

app.post("/sources/analyze", async (req, res) => {
  try {
    const { type = "transcript", title, content, demo } = req.body || {};
    let body = content;
    let sourceType = type;
    let sourceTitle = title;
    if (demo && DEMO_TRANSCRIPTS[demo]) {
      const d = DEMO_TRANSCRIPTS[demo];
      body = d.body;
      sourceType = d.type;
      sourceTitle = d.title;
    }
    if (!body || !String(body).trim()) {
      return fail(res, Object.assign(new Error("Paste a transcript, Slack thread, CSV, or choose a demo."), { status: 400 }));
    }

    const source = store.insert("sources", {
      type: sourceType,
      title: sourceTitle || `${sourceType} · ${new Date().toISOString().slice(0, 16)}`,
      content: body,
      created_at: nowIso(),
    });

    const extracted = await extractWithOptionalLlm(body, sourceType === "csv" ? "csv" : "transcript");
    const claims = [];
    for (const raw of extracted.claims) {
      const resolved = court.resolveMetric(raw.metric_name, {
        product: raw.product,
        country: raw.country,
      });
      const user = speakerUser(raw.speaker);
      const claim = store.insert("claims", {
        metric_id: resolved.metric?.id || null,
        matching_score: resolved.score,
        source_id: source.id,
        speaker: raw.speaker,
        role: raw.role,
        value: raw.value,
        unit: raw.unit,
        period: raw.period,
        country: raw.country,
        product: raw.product,
        population: raw.population,
        calculation_type: raw.calculation_type,
        status: raw.status,
        raw_excerpt: raw.raw_excerpt,
        source_type: source.type,
        source_title: raw.source_hint || source.title,
        ambiguity: raw.ambiguity,
        created_at: nowIso(),
        team_id: user?.team_id,
      });
      claims.push({ ...claim, metric_name: resolved.metric?.name || raw.metric_name, match: resolved });
    }

    const { opened, skipped } = court.detectAndOpenCases(claims.map((c) => c.id));

    for (const note of extracted.evidence_notes || []) {
      for (const c of opened) {
        court.attachEvidence(c.id, {
          type: "explanation",
          title: "Witness — definition language in the source",
          content: note,
          submitted_by: 5,
        });
      }
    }

    store.audit(0, "source.analyzed", "source", source.id, `${claims.length} claims, ${opened.length} cases`);
    publish("source.analyzed", { source, claims, opened });
    publish("dashboard.recalculated", dashboard());

    ok(res, {
      source,
      claims,
      ambiguous: extracted.ambiguous,
      method: extracted.method,
      cases_opened: opened.map((c) => court.assembleCase(c.id)),
      skipped,
    });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/demo/reset", (_req, res) => {
  store.reset();
  publish("workspace.reset", { t: Date.now() });
  ok(res, { ok: true, dashboard: dashboard() });
});

app.post("/tasks/background", (_req, res) => ok(res, runBackgroundPass()));

const uiDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "static", "dist");
if (fs.existsSync(uiDist)) {
  app.use(express.static(uiDist));
  app.get(/^(?!\/api(?:\/|$)|\/events(?:\/|$)|\/health(?:\/|$)|\/dashboard(?:\/|$)|\/cases(?:\/|$)|\/metrics(?:\/|$)|\/claims(?:\/|$)|\/precedents(?:\/|$)|\/sources(?:\/|$)|\/users(?:\/|$)|\/teams(?:\/|$)|\/audit(?:\/|$)|\/demos(?:\/|$)|\/demo(?:\/|$)|\/tasks(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(uiDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Metric Court on http://${HOST}:${PORT}${fs.existsSync(uiDist) ? " (API + courtroom)" : " (API only)"}`);
  setInterval(() => {
    try {
      runBackgroundPass();
    } catch (err) {
      console.error("background task", err);
    }
  }, 60_000);
});
