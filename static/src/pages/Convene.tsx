import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { AnalyzeResult } from "../types";
import { formatValue } from "../format";

const EMPTY = "";

export default function Convene() {
  const [content, setContent] = useState(EMPTY);
  const [type, setType] = useState("transcript");
  const [demo, setDemo] = useState("");
  const [demos, setDemos] = useState<{ id: string; title: string; type: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    api.demos().then(setDemos).catch(() => undefined);
  }, []);

  async function loadDemo(id: string) {
    setDemo(id);
    const full = await fetch("/api/demos").then((r) => r.json());
    // demos endpoint only returns preview; fetch body via analyze? We'll embed known text.
    const texts: Record<string, { type: string; title: string; body: string }> = {
      retention: {
        type: "transcript",
        title: "Q2 management meeting — retention",
        body: `Maya Chen (Sales Lead): Q2 retention reached 71%, so our customer strategy is working.

Rajesh Kumar (Finance Lead): That cannot be right. The dashboard shows 62%.

Aisha Rahman (Country Manager): The last board presentation said 68%.

Daniel Okonkwo (Data Analyst): The board deck excludes customers who were not yet eligible to return, but the finance dashboard includes the whole original cohort. Sales used eligible-to-return customers for the 71% figure. The canonical registry still does not specify eligibility treatment.`,
      },
      npl: {
        type: "slack",
        title: "#risk-npl Slack thread",
        body: `Sofia Berg (Head of Risk): NPL decreased by 5% this month. Flow NPL is coming down.

Rajesh Kumar (Finance Lead): The finance mart still shows NPL at 3.2% stock. That is not a 5% decrease.

Priya Nair (CDO): We cannot take both numbers to the ALCO pack without a definition.`,
      },
      disbursement: {
        type: "transcript",
        title: "Country review — disbursement",
        body: `Aisha Rahman (Country Manager): We disbursed $12 million last quarter.

Kenji Watanabe (Product Lead, BOLT): Malaysia BOLT disbursement was $9.4 million. Please do not quote the regional number as Malaysia.

Rajesh Kumar (Finance Lead): Regional Orbit plus Pulse plus BOLT is $12.1 million. Malaysia BOLT only is $9.4 million.`,
      },
      active: {
        type: "slack",
        title: "#growth Slack — active customers",
        body: `Maya Chen (Sales Lead): There are 4,200 active customers.

Daniel Okonkwo (Data Analyst): Product counts 3,850 as logged in last 30 days.

Kenji Watanabe (Product Lead, BOLT): Finance uses outstanding balance and gets 5,100.

Sofia Berg (Head of Risk): Risk only counts customers who transacted in the last 90 days: 2,900.`,
      },
    };
    const d = texts[id];
    if (d) {
      setType(d.type);
      setContent(d.body);
    }
    void full;
  }

  async function convene() {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const out = await api.analyze({
        type,
        title: demo ? demos.find((d) => d.id === demo)?.title : "Pasted source",
        content,
      });
      setResult(out);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="kicker">Add a source</div>
      <h1>Paste the disagreement. Convene the court.</h1>
      <p className="lede">
        Transcript, Slack-style messages, or a CSV of metric claims. The model extracts structured
        claims. Xano compares them, classifies the drift, and opens a case. It does not issue the verdict.
      </p>

      <div className="demo-row">
        {["retention", "npl", "disbursement", "active"].map((id) => (
          <button key={id} className={`demo ${demo === id ? "on" : ""}`} type="button" onClick={() => loadDemo(id)}>
            {id === "retention" ? "Killer demo — Retention v. Retention" : id}
          </button>
        ))}
        <button
          className="demo"
          type="button"
          onClick={() => {
            setType("csv");
            setDemo("csv");
            setContent("metric,value,unit,period,speaker,source\nCustomer Retention,71,percentage,Q2 2026,Sales Lead,Management meeting\nCustomer Retention,62,percentage,Q2 2026,Finance Lead,Finance dashboard");
          }}
        >
          CSV claims
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Maya Chen (Sales Lead): Q2 retention reached 71%…"
      />

      <div className="btn-row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={busy || !content.trim()} onClick={convene} type="button">
          {busy ? "Reading the transcript…" : "Convene Court"}
        </button>
        <span className="small muted">Extractor: deterministic court parser{result ? ` · ${result.method}` : ""}</span>
      </div>
      {err && <p className="error">{err}</p>}

      {result && (
        <div>
          <div className="section-label">Extracted claims — mapped to the canonical registry</div>
          <div className="claims-grid" style={{ gridTemplateColumns: `repeat(${Math.min(result.claims.length, 3)}, 1fr)` }}>
            {result.claims.map((c) => (
              <article className="claim" key={c.id}>
                <div className="slot">{c.speaker}</div>
                <div className="value">{formatValue(c.value, c.unit)}</div>
                <div>{c.metric_name}</div>
                <dt>Period</dt>
                <dd>{c.period || "—"}</dd>
                <dt>Population</dt>
                <dd>{c.population || "Not specified"}</dd>
                <dt>Match</dt>
                <dd className="mono">{Math.round((c.matching_score || c.match?.score || 0) * 100)}%</dd>
              </article>
            ))}
          </div>

          {result.cases_opened.length > 0 ? (
            <>
              <div className="section-label">Cases opened</div>
              {result.cases_opened.map((c) => (
                <div key={c.id} style={{ padding: "16px 0" }}>
                  <div className="case-no">{c.case_number}</div>
                  <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, margin: "6px 0 8px" }}>{c.title}</h2>
                  <p className="muted">{c.suggested_explanation}</p>
                  <div className="drifts" style={{ margin: "10px 0 16px" }}>
                    {(c.drift_types || []).map((d) => (
                      <span className="chip" key={d}>{d} drift</span>
                    ))}
                    <span className={`pill ${c.severity}`}>
                      <i /> {c.severity} {c.severity_score}
                    </span>
                  </div>
                  <button className="btn" type="button" onClick={() => nav(`/cases/${c.id}`)}>
                    Enter hearing
                  </button>
                </div>
              ))}
            </>
          ) : (
            <p className="toast">No new contradiction met the bar for a case. Claims were filed against the registry.</p>
          )}
        </div>
      )}
    </div>
  );
}
