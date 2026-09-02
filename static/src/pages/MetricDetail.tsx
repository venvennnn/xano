import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { Metric } from "../types";

export default function MetricDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState<Metric | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    api.metric(id).then(setM).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <p className="error">{err}</p>;
  if (!m) return <p className="muted">Loading registry entry…</p>;

  return (
    <div>
      <div className="kicker">{m.canonical_id}</div>
      <h1>{m.name}</h1>
      <p className="lede">
        Owner {m.owner?.name}. Approved source: {m.approved_source}.
      </p>
      <div className="section-label">Current definition</div>
      <div className="formula">{m.current_definition?.formula}</div>
      <p>
        <strong>Population.</strong> {m.current_definition?.population}
      </p>
      <p>
        <strong>Calculation.</strong> {m.current_definition?.calculation_type}
      </p>
      <p className="muted">{m.current_definition?.notes}</p>

      <div className="section-label">Approved aliases</div>
      <div className="drifts">
        {(m.aliases || []).map((a) => (
          <span className="chip" key={a.id}>{a.alias}</span>
        ))}
      </div>

      <div className="section-label">Version history</div>
      {(m.definitions || []).map((d) => (
        <div className="def-block" key={d.id}>
          <div className="ver">v{d.version} · {d.valid_from} {d.valid_to ? `→ ${d.valid_to}` : "→ current"}</div>
          <div>{d.population}</div>
          <p className="small muted">{d.notes}</p>
        </div>
      ))}

      <div className="section-label">Associated cases</div>
      {(Array.isArray(m.cases) ? m.cases : []).map((c) => (
        <div key={c.id} style={{ padding: "10px 0", cursor: "pointer" }} onClick={() => nav(`/cases/${c.id}`)}>
          <span className="case-no">{c.case_number}</span> {c.title}{" "}
          <span className={`pill ${c.status === "closed" ? "closed" : c.severity}`}>{c.status}</span>
        </div>
      ))}
    </div>
  );
}
