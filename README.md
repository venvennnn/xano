# Metric Court

**Organizational truth-resolution for the Xano: Rebuild a SaaS Tool You Hate track.**

Data catalogs define metrics. Metric Court resolves what happens when nobody agrees with the definition.

> Companies don’t have a data problem. They have a “same metric, different truth” problem.

When Sales reports **71% retention** and Finance reports **62%**, both may be technically correct. They used different cohorts. Metric Court opens a case, gathers the evidence, identifies the cause, and records an authoritative verdict — which then becomes **precedent**.

This repository is a complete hackathon MVP:

- **Streamlit courtroom** (`streamlit_app.py`) — the app you run and deploy. White background. One file, one `requirements.txt`, Streamlit Community Cloud.
- Deterministic court engine (`metric_court/`) — extract, match, drift, severity, verdict, precedent
- XanoScript (`xano/`) — tables, functions, APIs, database triggers, and scheduled tasks for the Xano challenge
- Optional React + Express (`static/`, `court-engine/`) if you still want the original Xano static-hosting path

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
python3 -m pip install -r requirements.txt
python3 -m unittest metric_court.test_engine
streamlit run streamlit_app.py
```

Open [http://localhost:8501](http://localhost:8501). That is the whole app — no Vite proxy, no Express port, no Xano workspace required for the demo.

## Deploy (Streamlit Community Cloud)

1. Push this repo to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io), sign in with GitHub, **Create app**.
3. Repository: `venvennnn/xano`. Branch: `main`. Main file: `streamlit_app.py`.
4. Deploy. The live URL is the “Try it out” link.

That is the entire deployment structure.

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

## Deploy to a Xano workspace (optional)

The live demo is Streamlit. XanoScript in `xano/` is the sponsor backend model — tables, functions, APIs, triggers, tasks. If you connect a workspace:

1. Push `xano/` with the [Xano CLI](https://docs.xano.com/xano-cli/get-started).
2. The Streamlit app does not need that workspace. It runs the same court rules in `metric_court/`.

## Architecture

```
streamlit_app.py     Courtroom UI (Docket, Convene, Hearing, Registry, Precedents, Drift radar)
metric_court/        Python court engine + seeded Aether Credit registry
.streamlit/          White light theme
requirements.txt     streamlit, pandas, plotly
xano/                XanoScript for the sponsor backend (tables, functions, APIs, triggers, tasks)
static/              Optional React courtroom
court-engine/        Optional Express runtime of the same Xano API contract
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
