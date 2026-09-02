import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { CourtCase } from "../types";
import { formatValue, RETENTION_VERDICT, VERDICT_OPTIONS } from "../format";

export default function Hearing({ tick }: { tick: number }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState<CourtCase | null>(null);
  const [err, setErr] = useState("");
  const [outcome, setOutcome] = useState("both_correct");
  const [statement, setStatement] = useState(RETENTION_VERDICT.statement);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (!id) return;
    api.case(id).then((row) => {
      setC(row);
      if (row.metric?.canonical_id === "M-RET-001" && row.status !== "closed") {
        setOutcome("both_correct");
        setStatement(RETENTION_VERDICT.statement);
      } else if (row.suggested_explanation) {
        setStatement(row.suggested_explanation);
      }
    }).catch((e) => setErr(e.message));
  }, [id, tick]);

  async function issue() {
    if (!c) return;
    setBusy(true);
    setErr("");
    try {
      const payload: Record<string, unknown> = {
        outcome,
        statement,
        issued_by: 1,
        create_precedent: true,
      };
      if (outcome === "both_correct" || outcome === "canonical_amended") {
        Object.assign(payload, {
          amend_definition: true,
          population: RETENTION_VERDICT.population,
          calculation_type: RETENTION_VERDICT.calculation_type,
          formula: RETENTION_VERDICT.formula,
          definition_notes: RETENTION_VERDICT.definition_notes,
          alias: RETENTION_VERDICT.alias,
          precedent_title: RETENTION_VERDICT.precedent_title,
          precedent_rule: RETENTION_VERDICT.precedent_rule,
          approved_source: RETENTION_VERDICT.approved_source,
        });
      }
      const result = (await api.verdict(c.id, payload)) as {
        definition?: { version: number };
        alias?: { alias: string };
        reassessed?: { case_number: string }[];
        case: CourtCase;
      };
      const bits = [
        "Verdict on file.",
        result.definition ? `Definition version ${result.definition.version} written.` : "",
        result.alias ? `Alias “${result.alias.alias}” stored.` : "",
        result.reassessed?.length ? `Closed related ${result.reassessed.map((x) => x.case_number).join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      setFlash(bits);
      setC(await api.case(c.id));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (err && !c) return <p className="error">{err}</p>;
  if (!c) return <p className="muted">Calling the case…</p>;

  const def = c.current_definition;
  const closed = c.status === "closed";
  const latestVerdict = c.verdicts?.[c.verdicts.length - 1];

  return (
    <div>
      <div className="hearing-head">
        <div>
          <div className="kicker">{c.case_number} · {c.metric?.name || c.metric_name}</div>
          <h1>{c.title}</h1>
          <p className="meta-line">
            Assigned to {c.owner?.name} · Hearing by {c.deadline} ·{" "}
            <span className={`pill ${c.severity}`}>
              <i /> {c.severity} {c.severity_score}
            </span>
          </p>
        </div>
        {closed && <span className="stamp">Verdict entered</span>}
      </div>

      <div className="claims-grid" style={{ gridTemplateColumns: `repeat(${Math.min(c.claims?.length || 1, 3)}, 1fr)` }}>
        {(c.claims || []).map((claim) => (
          <article className="claim" key={claim.id}>
            <div className="slot">Claim {claim.slot} · {claim.speaker}</div>
            <div className="value">{formatValue(claim.value, claim.unit)}</div>
            <dt>Population</dt>
            <dd>{claim.population || "Not specified"}</dd>
            <dt>Source</dt>
            <dd>{claim.source_title || claim.source_type}</dd>
            <dt>Period</dt>
            <dd>{claim.period} · {claim.country} · {claim.product}</dd>
            <dt>Status</dt>
            <dd>{claim.status}</dd>
          </article>
        ))}
      </div>

      <div className="two">
        <div>
          <div className="section-label">Detected differences</div>
          <ul className="diff-list">
            {(c.detected_differences || []).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p style={{ marginTop: 18 }}>{c.suggested_explanation}</p>

          <div className="section-label">Canonical definition</div>
          {def ? (
            <div className="def-block">
              <div className="ver">Version {def.version}{!def.valid_to ? " · current" : ""}</div>
              <div className="formula">{def.formula}</div>
              <p>
                <strong>Population.</strong> {def.population}{" "}
                {(!def.population || /not specified/i.test(def.population)) && (
                  <span className="warn-line">The registry does not specify eligibility treatment.</span>
                )}
              </p>
              <p className="small muted">{def.notes}</p>
            </div>
          ) : (
            <p className="muted">No canonical definition on file.</p>
          )}

          <div className="section-label">Prior precedent</div>
          {(c.precedents || []).length === 0 && <p className="muted">None on this exact question.</p>}
          {(c.precedents || []).map((p) => (
            <div className="precedent" key={p.id} style={{ paddingTop: 8 }}>
              <div className="case-no">{p.applies_to_drift?.join(" · ")}</div>
              <h3 style={{ fontSize: 22 }}>{p.title}</h3>
              <p>{p.rule}</p>
            </div>
          ))}

          <div className="section-label">Witnesses & evidence</div>
          {(c.evidence || []).map((e) => (
            <div key={e.id} className="def-block">
              <div className="ver">{e.type} · {e.title}</div>
              <p>{e.content}</p>
            </div>
          ))}

          {(c.related_cases || []).length > 0 && (
            <>
              <div className="section-label">Related matters</div>
              {(c.related_cases || []).map((r) => (
                <div key={r.id} style={{ padding: "8px 0", cursor: "pointer" }} onClick={() => nav(`/cases/${r.id}`)}>
                  <span className="case-no">{r.case_number}</span> {r.title}{" "}
                  <span className={`pill ${r.status === "closed" ? "closed" : r.severity}`}>{r.status}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="verdict-box">
          <div className="section-label">Verdict</div>
          {closed && latestVerdict ? (
            <div>
              <p className="banner">{latestVerdict.statement}</p>
              <p className="small muted">
                {latestVerdict.outcome.replace(/_/g, " ")}
                {latestVerdict.definition_version_created
                  ? ` · definition v${latestVerdict.definition_version_created}`
                  : ""}
                {" · "}
                {latestVerdict.issued_at.slice(0, 16).replace("T", " ")}
              </p>
              {flash && <p className="toast">{flash}</p>}
            </div>
          ) : (
            <>
              {VERDICT_OPTIONS.map((opt) => (
                <label key={opt.id}>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === opt.id}
                    onChange={() => setOutcome(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              <textarea value={statement} onChange={(e) => setStatement(e.target.value)} />
              <button className="btn danger" disabled={busy} type="button" onClick={issue}>
                {busy ? "Entering the record…" : "Issue Verdict"}
              </button>
              {err && <p className="error">{err}</p>}
              {flash && <p className="toast">{flash}</p>}
              <p className="small muted" style={{ marginTop: 12 }}>
                Issuing a definition verdict writes a new metric version, stores aliases, closes related
                open cases, and republishes the docket.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
