# Court engine

Local Xano-compatible runtime. Same routes the React app will call on a Xano instance.

```
POST /sources/analyze   extract claims, match metrics, open cases
POST /cases/:id/verdict human verdict → definition version, precedent, reassess
GET  /dashboard/drift   radar payload
GET  /events            SSE courtroom channel
```

Custom-function equivalents live in `src/severity.js`, `src/match.js`, `src/drift.js`, `src/court.js`.
