import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Precedent } from "../types";

export default function Precedents({ tick }: { tick: number }) {
  const [rows, setRows] = useState<Precedent[]>([]);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    api.precedents().then(setRows).catch((e) => setErr(e.message));
  }, [tick]);

  if (err) return <p className="error">{err}</p>;

  return (
    <div>
      <div className="kicker">Precedent library</div>
      <h1>A closed case is only useful if the next disagreement can find it.</h1>
      <p className="lede">
        Future claims are evaluated against these rules. That closed loop is the product.
      </p>
      {rows.map((p) => (
        <article className="precedent" key={p.id}>
          <div className="case-no">
            {p.case?.case_number} · {p.metric?.name} · {(p.applies_to_drift || []).join(", ")} drift
          </div>
          <h3>{p.title}</h3>
          <p>{p.rule}</p>
          {p.case && (
            <button className="ghost" type="button" onClick={() => nav(`/cases/${p.case_id}`)}>
              Read the originating case
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
