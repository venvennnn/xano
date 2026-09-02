# XanoScript — Metric Court backend

This folder is the production translation of `court-engine/`. The Node runtime exists so the killer demo runs without a Xano instance. The **sponsor story** is: Xano is the workflow, rules engine, audit system, API layer, realtime case manager and hosting platform.

## Layout

| Path | Xano primitive |
| --- | --- |
| `tables/` | Relational model: users, teams, metrics, definitions, aliases, sources, claims, dimensions, cases, evidence, verdicts, precedents, appeals, audit |
| `functions/` | Deterministic scoring: match, value difference, period compatibility, scope overlap, severity, precedent similarity |
| `apis/` | The routes the React app already calls |
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

Point the SPA at the API group with `VITE_XANO_API_BASE`.

The severity function `fn_case_severity` is the one piece that must stay deterministic. Do not replace it with a model call.
