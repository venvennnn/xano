import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Metric } from "../types";

export default function Registry({ tick }: { tick: number }) {
  const [rows, setRows] = useState<Metric[]>([]);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.metrics().then(setRows).catch((e) => setErr(e.message));
  }, [tick]);

  if (err) return <p className="error">{err}</p>;

  return (
    <div>
      <div className="kicker">Canonical metric registry</div>
      <h1>A definition is not a verdict. It is the thing the verdict is about.</h1>
      <p className="lede">
        Eight management metrics for Aether Credit. Health status is computed from open cases, not from a
        confidence model.
      </p>
      <div className="registry-list">
        {rows.map((m) => (
          <div className="registry-row" key={m.id} onClick={() => nav(`/registry/${m.id}`)}>
            <header>
              <div className="mono small muted">{m.canonical_id}</div>
              {m.name}
            </header>
            <div>
              <div className="small muted">Owner</div>
              {m.owner?.name}
            </div>
            <div>
              <div className="small muted">Population</div>
              {m.current_definition?.population || "—"}
            </div>
            <div>
              <span className={`pill ${m.health_status === "critical" || m.health_status === "disputed" ? "critical" : m.health_status === "watch" ? "high" : "closed"}`}>
                <i /> {m.health_status}
              </span>
            </div>
            <div className="mono">{m.open_cases ? `${m.open_cases} open` : `${m.cases || 0} cases`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
