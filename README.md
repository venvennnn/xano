# Metric Court

**Organizational truth-resolution for the Xano: Rebuild a SaaS Tool You Hate track.**

Data catalogs define metrics. Metric Court resolves what happens when nobody agrees with the definition.

> Companies don’t have a data problem. They have a “same metric, different truth” problem.

When Sales reports **71% retention** and Finance reports **62%**, both may be technically correct. They used different cohorts. Metric Court opens a case, gathers the evidence, identifies the cause, and records an authoritative verdict — which then becomes **precedent**.

This repository is a complete hackathon MVP:

- React + Vite courtroom (`static/`) ready for [Xano static hosting](https://docs.xano.com/xano-features/static-hosting)
- Deterministic court engine (`court-engine/`) — the local stand-in for Xano custom functions, triggers, background tasks, and APIs
- XanoScript (`xano/`) — tables, functions, APIs, database triggers, and scheduled tasks for the production Xano workspace

## Killer demo (two minutes)

Fictional company: **Aether Credit**, a Malaysian digital lender. Products: BOLT, Orbit, Pulse. No confidential data.

1. Open the docket. Headline: *Your company currently has four definitions of “Active Customer.”*
2. Go to **Convene**, load **Killer demo — Retention v. Retention**, click **Convene Court**.
3. Three claims extract — 71%, 62%, 68% — all mapped to Customer Retention.
4. Case **MC-104: Retention v. Retention** opens. Same quarter, same country, different population, different eligibility treatment, three sources.
5. In the hearing, keep **Both are correct under different definitions** and click **Issue Verdict**.
6. The engine writes definition **v4**, stores the alias *Eligible-customer retention*, closes related **MC-101**, and republishes the docket.

Closing line:

> Metric Court doesn’t tell your company which number sounds right. It gives every number a definition, every disagreement a hearing, and every resolution a precedent.

## Devpost

Paste-ready submission fields, screenshots, and the demo video are in [`DEVPOST.md`](./DEVPOST.md) and `docs/submission/`. Submit on [the hackathon Devpost](https://api-cloud-ai-hackathon-2026.devpost.com/) before **Thursday, 3 September 2026, 10:00 AM PST**. Challenge: **Xano: Rebuild a SaaS Tool You Hate**.

## Run locally

```bash
npm install
npm test
npm run dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- Court APIs: [http://localhost:8080](http://localhost:8080)

The UI proxies `/api` and `/events` to the engine. Optional `OPENAI_API_KEY` upgrades claim extraction; the killer demo does not need it.

## Why Xano is not just the database

The model extracts claims. **Xano operates the court.**

| Xano primitive | What Metric Court uses it for |
| --- | --- |
| Database | Users, teams, metric registry, aliases, definition versions, claims, sources, cases, evidence, verdicts, precedents, appeals, audit events |
| Custom functions | Matching score, relative value difference, period compatibility, scope overlap, case severity, precedent similarity |
| Database triggers | Open a case on incompatible claim insert; assign the metric owner; audit evidence; version a metric after a verdict; reassess open cases; publish realtime |
| Realtime | Courtroom channel → docket and hearing |
| Background tasks | Recheck unresolved cases, overdue hearings, recurring-drift summaries, daily digest, chronic definitions |
| API + static hosting | React talks to Xano APIs; Vite build is hosted beside the backend |

Severity is **not** an LLM guess:

\[
P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R
\]

| Band | Label |
| --- | --- |
| 0–29 | Informational |
| 30–59 | Review |
| 60–79 | High |
| 80–100 | Critical |

The six kinds of drift are semantic, not ML: **value, definition, time, scope, status, source**.

## MVP scope

**Built:** preloaded registry, paste transcript / Slack / CSV, claim extraction, metric matching, deterministic drift classification, automatic case creation, case hearing, human verdict, definition versioning, precedent, realtime docket, one-click seeded demo.

**Skipped (on purpose):** real Slack or Meet, Snowflake, enterprise SSO, SQL execution, multi-tenant orgs, notification vendors, statistical anomaly detection.

## Deploy to a Xano workspace

1. Push `xano/` with the [Xano CLI](https://docs.xano.com/xano-cli/get-started) (`xano auth`, then sync tables, functions, APIs, triggers, tasks).
2. Set `VITE_XANO_API_BASE` to the API group URL.
3. `npm run build -w static` and publish with `xano static_host build push`.

Until the workspace is connected, `court-engine` is the same workflow running locally — same routes, same severity function, same verdict side-effects.

## Architecture

```
static/          React + Vite courtroom (Docket, Convene, Hearing, Registry, Precedents, Drift radar)
court-engine/    Express runtime that implements the Xano API contract
xano/            XanoScript for production: tables, functions, APIs, triggers, tasks
```

API surface (frontend → Xano or court-engine):

```
POST /sources/analyze
POST /claims
GET  /claims/:id
GET  /metrics
POST /metrics
GET  /metrics/:id
GET  /metrics/:id/history
GET  /cases
GET  /cases/:id
POST /cases/:id/evidence
POST /cases/:id/verdict
POST /cases/:id/appeal
GET  /precedents
GET  /dashboard/drift
```
