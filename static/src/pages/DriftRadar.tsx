import { useEffect, useState } from "react";
import { api } from "../api";
import type { Radar } from "../types";

export default function DriftRadar({ tick }: { tick: number }) {
  const [data, setData] = useState<Radar | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.radar().then(setData).catch((e) => setErr(e.message));
  }, [tick]);

  if (err) return <p className="error">{err}</p>;
  if (!data) return <p className="muted">Sweeping the docket…</p>;

  const series = data.value_drift_over_time || [];
  const w = 720;
  const h = 200;
  const pad = 28;
  const max = Math.max(...series.map((s) => s.score), 1);
  const pts = series.map((s, i) => {
    const x = pad + (i / Math.max(series.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (s.score / max) * (h - pad * 2);
    return { x, y, s };
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");

  const driftEntries = Object.entries(data.recurring_drift || {}).sort((a, b) => b[1] - a[1]);
  const driftMax = Math.max(...driftEntries.map(([, n]) => n), 1);

  return (
    <div>
      <div className="kicker">Drift radar</div>
      <h1>{data.headline}</h1>
      <p className="lede">
        Not machine-learning data drift. Semantic and organizational metric drift: definition, value,
        time, scope, status, source.
      </p>

      <div className="stats">
        <div className="stat">
          <div className="n">{data.open_cases}</div>
          <div className="l">Open cases</div>
        </div>
        <div className="stat">
          <div className={`n ${data.critical_cases ? "alert" : ""}`}>{data.critical_cases}</div>
          <div className="l">Critical</div>
        </div>
        <div className="stat">
          <div className="n">{data.avg_time_to_verdict_days}</div>
          <div className="l">Average days to verdict</div>
        </div>
        <div className="stat">
          <div className="n">{data.reopened?.length || 0}</div>
          <div className="l">Reopened or reassessed</div>
        </div>
      </div>

      <div className="section-label">Value-conflict severity over time</div>
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Severity over time">
        <path d={d} fill="none" stroke="#8f1d2c" strokeWidth="1.75" />
        {pts.map((p) => (
          <g key={p.s.case_number}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#8f1d2c" />
            <text x={p.x + 6} y={p.y - 8}>
              {p.s.case_number} {p.s.score}
            </text>
          </g>
        ))}
      </svg>

      <div className="two">
        <div>
          <div className="section-label">Definition drift by team</div>
          <div className="bars">
            {(data.definition_drift_by_team || []).map((row) => {
              const maxC = Math.max(...data.definition_drift_by_team.map((r) => r.count), 1);
              return (
                <div className="bar-row" key={row.team}>
                  <div className="lbl">{row.team}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(row.count / maxC) * 100}%` }} />
                  </div>
                  <div className="val">{row.count}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="section-label">Most frequently misunderstood</div>
          {(data.most_misunderstood || []).map((row) => (
            <div key={row.metric?.id} className="def-block">
              <strong>{row.metric?.name}</strong>
              <div className="mono small">{row.count} cases</div>
            </div>
          ))}
          <div className="section-label">Recurring drift types</div>
          <div className="bars">
            {driftEntries.map(([k, n]) => (
              <div className="bar-row" key={k}>
                <div className="lbl">{k}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(n / driftMax) * 100}%` }} />
                </div>
                <div className="val">{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
