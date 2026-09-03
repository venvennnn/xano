# Metric Court

**Organizational truth-resolution for the Xano: Rebuild a SaaS Tool You Hate track.**

Data catalogs define metrics. Metric Court resolves what happens when nobody agrees with the definition.

> Companies don’t have a data problem. They have a “same metric, different truth” problem.

When Sales reports **71% retention** and Finance reports **62%**, both may be technically correct. They used different cohorts. Metric Court opens a case, gathers the evidence, identifies the cause, and records an authoritative verdict — which then becomes **precedent**.

This repository is a complete hackathon MVP:

- **Streamlit courtroom** (`streamlit_app.py`) — the UI you run and deploy. White background.
- **Xano court** (`xano/`) — the required backend. Tables, custom functions, APIs, database triggers, scheduled tasks. Streamlit talks to the Xano API group.
- Local stand-in (`metric_court/`) — same Xano functions in Python so the demo runs before a workspace is connected
- Optional React + Express (`static/`, `court-engine/`) — the original Xano static-hosting path

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

Open [http://localhost:8501](http://localhost:8501). The sidebar says **Court · Xano** when a workspace is connected, or **Court · Xano stand-in (local)** until you set `XANO_API_BASE`.

## Connect Xano (required for the sponsor track)

Streamlit is only the courtroom. **Xano operates the court.**

1. Push `xano/` with the [Xano CLI](https://docs.xano.com/xano-cli/get-started) (`xano auth`, then sync tables, functions, APIs, triggers, tasks).
2. Seed the Aether Credit registry in the workspace (or point Streamlit at `court-engine` first — same routes).
3. In Streamlit Cloud → **Settings → Secrets**, or in `.streamlit/secrets.toml`:

```toml
XANO_API_BASE = "https://YOUR-INSTANCE.xano.io/api:YOUR_GROUP"
XANO_API_KEY = ""
```

| Xano primitive | What Metric Court uses it for |
| --- | --- |
| Database | Users, teams, metric registry, aliases, definition versions, claims, sources, cases, evidence, verdicts, precedents, appeals, audit events |
| Custom functions | Matching score, relative value difference, period compatibility, scope overlap, case severity, precedent similarity |
| Database triggers | `on_claim_insert` opens a case; `on_verdict_insert` reassesses related matters |
| Realtime | Courtroom channel → docket and hearing |
| Background tasks | Overdue hearings, unresolved recheck, daily drift digest |
| API group | Streamlit calls `/sources/analyze`, `/cases`, `/cases/{id}/verdict`, `/dashboard` |

Without `XANO_API_BASE`, Streamlit runs the same functions locally so you can still demo. The XanoScript in `xano/` is the production backend judges should review.

## Deploy (Streamlit Community Cloud)

1. Push this repo to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io), sign in with GitHub, **Create app**.
3. Repository: `venvennnn/xano`. Branch: `main`. Main file: `streamlit_app.py`.
4. Paste `XANO_API_BASE` in Secrets.
5. Deploy. The live URL is the “Try it out” link.

## Why Xano is not just the database

The model extracts claims. **Xano operates the court.** Streamlit never issues a verdict on its own — it POSTs to Xano.

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

## Push the Xano workspace

```bash
npm i -g @xano/cli
xano auth
# sync xano/tables xano/functions xano/apis xano/triggers xano/tasks
```

`court-engine` implements the same API contract locally (`npm start` in `court-engine/`, then `XANO_API_BASE=http://localhost:8080`).

## Architecture

```
streamlit_app.py     Courtroom UI — talks to the Xano API group
xano/                Xano backend: tables, functions, APIs, triggers, tasks
metric_court/        Local stand-in of those Xano functions + HTTP client
.streamlit/          White theme + secrets.toml.example (XANO_API_BASE)
court-engine/        Same API contract on localhost:8080
static/              Optional React courtroom
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
