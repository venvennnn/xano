# XanoScript — Metric Court backend

This folder is the production Xano backend. **Streamlit is only the courtroom UI.** It calls this API group when `XANO_API_BASE` is set.

The Node `court-engine/` implements the same routes locally so you can demo before a workspace is connected. The **sponsor story** is: Xano is the workflow, rules engine, audit system, API layer, realtime case manager — not a database that stores the model’s output.

## Layout

| Path | Xano primitive |
| --- | --- |
| `tables/` | Relational model: users, teams, metrics, definitions, aliases, sources, claims, dimensions, cases, evidence, verdicts, precedents, appeals, audit |
| `functions/` | Deterministic scoring: match, value difference, period compatibility, scope overlap, severity, precedent similarity |
| `apis/` | The routes Streamlit calls (`/sources/analyze`, `/cases`, `/cases/{id}/verdict`, `/dashboard`) |
| `triggers/` | `on_claim_insert`, `on_verdict_insert`, `on_evidence_change` |
| `tasks/` | Overdue hearings (hourly), recheck unresolved (6h), daily drift digest |

## Push

```bash
npm i -g @xano/cli
xano auth
# then push this directory against your workspace / branch
```

Static frontend:

```bash
xano static_host create metric-court
xano static_host build push metric-court -d ./static -n "mvp"
xano static_host deploy metric-court --build_id <id> --env dev
```

Point Streamlit at the API group with `XANO_API_BASE` (Streamlit secrets or env). The optional React SPA still uses `VITE_XANO_API_BASE`.

The severity function `fn_case_severity` is the one piece that must stay deterministic. Do not replace it with a model call.
