import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Dashboard } from "../types";
import { formatValue } from "../format";

export default function Docket({ tick }: { tick: number }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setErr(e.message));
  }, [tick]);

  if (err) return <p className="error">{err}</p>;
  if (!data) return <p className="muted">Opening the docket…</p>;

  const k = data.kpis;
  return (
    <div>
      <div className="kicker">Court docket · {data.company}</div>
      <h1>{data.headline}</h1>
      <p className="lede">
        Companies do not have a data problem. They have a same-metric, different-truth problem.
        Metric Court opens a case when two people quote conflicting versions of the same number.
      </p>
      <div className="stats">
        <div className="stat">
          <div className="n">{k.open_cases}</div>
          <div className="l">Open cases on the docket</div>
        </div>
        <div className="stat">
          <div className={`n ${k.critical_cases ? "alert" : ""}`}>{k.critical_cases}</div>
          <div className="l">Critical — hearing this week</div>
        </div>
        <div className="stat">
          <div className="n">{k.avg_resolution_days}</div>
          <div className="l">Days, average, to a verdict</div>
        </div>
        <div className="stat">
          <div className="n" style={{ fontSize: 28, paddingTop: 8 }}>{k.most_disputed_metric}</div>
          <div className="l">Most disputed metric</div>
        </div>
      </div>

      <div className="section-label">Open hearings</div>
      <table className="plain">
        <thead>
          <tr>
            <th>Case</th>
            <th>Matter</th>
            <th>Drift</th>
            <th>Priority</th>
            <th>Judge</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {data.open_cases.map((c) => (
            <tr key={c.id} onClick={() => nav(`/cases/${c.id}`)}>
              <td className="case-no">{c.case_number}</td>
              <td>
                <div>{c.title}</div>
                <div className="small muted">{c.metric_name}</div>
              </td>
              <td>
                <div className="drifts">
                  {(c.drift_types || []).map((d) => (
                    <span className="chip" key={d}>{d}</span>
                  ))}
                </div>
              </td>
              <td>
                <span className={`pill ${c.severity}`}>
                  <i /> {c.severity} {c.severity_score}
                </span>
              </td>
              <td className="small">{c.owner_name}</td>
              <td className="mono small">{c.deadline}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-label">Teams generating definition conflicts</div>
      <div className="bars">
        {data.definition_conflicts_by_team.map((row) => {
          const max = Math.max(...data.definition_conflicts_by_team.map((r) => r.count), 1);
          return (
            <div className="bar-row" key={row.team}>
              <div className="lbl">{row.team}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
              <div className="val">{row.count}</div>
            </div>
          );
        })}
      </div>

      <div className="section-label">Closed — precedent on file</div>
      <table className="plain">
        <thead>
          <tr>
            <th>Case</th>
            <th>Matter</th>
            <th>Figures</th>
            <th>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {data.closed_cases.map((c) => (
            <tr key={c.id} onClick={() => nav(`/cases/${c.id}`)}>
              <td className="case-no">{c.case_number}</td>
              <td>{c.title}</td>
              <td className="mono">
                {(c.values || []).map((v) => formatValue(v, c.metric_name === "Disbursement Volume" ? "usd" : c.metric_name === "Active Customers" ? "count" : "percentage")).join(" · ")}
              </td>
              <td className="small muted">{c.closed_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
