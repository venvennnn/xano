"""Metric Court — Streamlit courtroom. White background. One-file deploy."""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from metric_court.backend import create_backend, xano_configured
from metric_court.engine import DEMOS, RETENTION_VERDICT, format_value, fresh_state

st.set_page_config(
    page_title="Metric Court",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"Get help": None, "Report a bug": None, "About": "Metric Court — organizational truth-resolution"},
)

WHITE = """
<style>
html, body, .stApp, [data-testid="stAppViewContainer"], [data-testid="stHeader"],
[data-testid="stToolbar"], [data-testid="stSidebar"], [data-testid="stSidebarContent"],
[data-testid="stSidebarNav"], [data-testid="stBottomBlockContainer"],
[data-testid="stDecoration"], [data-testid="stStatusWidget"],
section.main, .main .block-container, .stMain, .stMainBlockContainer,
[data-testid="stVerticalBlock"], [data-testid="stHorizontalBlock"],
[data-testid="stExpander"], [data-testid="stExpanderDetails"],
[data-testid="stMetric"], [data-testid="stAlert"],
div[data-baseweb="input"], div[data-baseweb="textarea"],
div[data-baseweb="select"] > div, .stTextArea textarea, .stTextInput input,
.stRadio, .stSelectbox, [data-testid="stChatInput"] {
  background: #ffffff !important;
}
[data-testid="stHeader"] { background: #ffffff !important; border-bottom: 0; }
[data-testid="stToolbar"] { background: #ffffff !important; }
[data-testid="stSidebar"],
[data-testid="stSidebar"] > div,
[data-testid="stSidebarContent"],
[data-testid="stSidebarUserContent"],
section[data-testid="stSidebar"] {
  background: #ffffff !important;
  background-color: #ffffff !important;
}
[data-testid="stSidebar"] {
  border-right: 1px solid #ececec;
}
[data-testid="stBottom"] { background: #ffffff !important; }
.stApp { color: #161513; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif !important; letter-spacing: -0.02em; color: #161513; }
.kicker { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.18em;
  text-transform: uppercase; color: #8f1d2c; margin-bottom: 0.25rem; }
.lede { color: #6d6a62; font-size: 1.05rem; max-width: 62ch; }
.case-no { font-family: ui-monospace, monospace; color: #8f1d2c; }
.claim-value { font-family: Georgia, serif; font-size: 3.2rem; line-height: 1; margin: 0.2rem 0 0.6rem; color: #161513; }
.stamp { font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: 0.12em;
  text-transform: uppercase; color: #8f1d2c; border: 1px solid #8f1d2c; padding: 4px 8px; display: inline-block; }
div[data-testid="stMetric"] { background: #ffffff !important; border-top: 1px solid #ececec; padding-top: 0.6rem; }
footer { visibility: hidden; }
#MainMenu { visibility: hidden; }
</style>
"""
st.markdown(WHITE, unsafe_allow_html=True)


def court():
    if xano_configured():
        return create_backend()
    if "court" not in st.session_state:
        st.session_state.court = fresh_state()
    return create_backend(st.session_state.court)


def reset_court():
    backend = court()
    backend.reset()
    st.session_state.pop("analyze", None)
    st.session_state.pop("hearing_id", None)


def pill(level: str, score=None) -> str:
    color = {"critical": "#b42318", "high": "#b54708", "review": "#8a6a12", "informational": "#3f6b21", "closed": "#3f6b21", "stable": "#3f6b21", "disputed": "#b42318", "watch": "#b54708"}.get(level, "#6d6a62")
    extra = f" {score}" if score is not None else ""
    return f"<span style='color:{color};font-size:12px;letter-spacing:.04em;text-transform:uppercase'>● {level}{extra}</span>"


def page_docket():
    dash = court().dashboard()
    st.markdown("<div class='kicker'>Court docket · {}</div>".format(dash["company"]), unsafe_allow_html=True)
    st.title(dash["headline"])
    st.markdown("<p class='lede'>Companies do not have a data problem. They have a same-metric, different-truth problem.</p>", unsafe_allow_html=True)
    k = dash["kpis"]
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Open cases", k["open_cases"])
    c2.metric("Critical", k["critical_cases"])
    c3.metric("Days to verdict", k["avg_resolution_days"])
    c4.metric("Most disputed", k["most_disputed_metric"])

    st.subheader("Open hearings")
    if not dash["open_cases"]:
        st.write("The docket is clear.")
    for c in dash["open_cases"]:
        cols = st.columns([1.1, 2.4, 1.6, 1.2, 1.2, 1])
        cols[0].markdown(f"<span class='case-no'>{c['case_number']}</span>", unsafe_allow_html=True)
        cols[1].write(f"**{c['title']}**  \n{c.get('metric_name') or ''}")
        cols[2].write(" · ".join(c.get("drift_types") or []))
        cols[3].markdown(pill(c.get("severity", ""), c.get("severity_score")), unsafe_allow_html=True)
        cols[4].write(c.get("owner_name") or "")
        cols[5].write(c.get("deadline") or "")
        if cols[0].button("Hear", key=f"open_{c['id']}"):
            st.session_state.hearing_id = c["id"]
            st.session_state.pending_nav = "Hearing"
            st.rerun()

    teams = dash["definition_conflicts_by_team"]
    if teams:
        st.subheader("Teams generating definition conflicts")
        df = pd.DataFrame(teams).set_index("team")
        st.bar_chart(df, color="#8f1d2c", horizontal=True)

    st.subheader("Closed — precedent on file")
    for c in dash["closed_cases"]:
        vals = " · ".join(format_value({"value": v, "unit": "percentage"}) for v in (c.get("values") or []) if v is not None)
        st.markdown(f"<span class='case-no'>{c['case_number']}</span>  {c['title']}  ·  {vals}", unsafe_allow_html=True)


def page_convene():
    st.markdown("<div class='kicker'>Add a source</div>", unsafe_allow_html=True)
    st.title("Paste the disagreement. Convene the court.")
    st.markdown("<p class='lede'>Transcript, Slack-style messages, or a CSV. The parser extracts claims. The court compares them, classifies drift, and opens a case. It does not issue the verdict.</p>", unsafe_allow_html=True)

    if "transcript" not in st.session_state:
        st.session_state.transcript = DEMOS["retention"]["body"]
        st.session_state.demo_id = "retention"

    demo_key = st.radio("Preloaded demonstration", list(DEMOS), format_func=lambda k: DEMOS[k]["title"], horizontal=True)
    if st.button("Load demo into the box"):
        st.session_state.transcript = DEMOS[demo_key]["body"]
        st.session_state.demo_id = demo_key

    text = st.text_area("Source", key="transcript", height=260)

    if st.button("Convene Court", type="primary"):
        try:
            demo_id = st.session_state.get("demo_id")
            demo_meta = DEMOS.get(demo_id) or {}
            st.session_state.analyze = court().analyze(
                content=text,
                source_type=demo_meta.get("type", "transcript"),
                title=demo_meta.get("title", "Pasted source"),
                demo=demo_id,
            )
        except Exception as e:
            st.error(str(e))
            return

    result = st.session_state.get("analyze")
    if not result:
        return
    st.subheader("Extracted claims — mapped to the canonical registry")
    cols = st.columns(max(len(result["claims"]), 1))
    for col, claim in zip(cols, result["claims"]):
        with col:
            st.caption(claim.get("speaker"))
            st.markdown(f"<div class='claim-value'>{format_value(claim)}</div>", unsafe_allow_html=True)
            st.write(claim.get("metric_name"))
            st.write(f"Period  ·  {claim.get('period') or '—'}")
            st.write(f"Population  ·  {claim.get('population') or 'Not specified'}")
            st.write(f"Match  ·  {int((claim.get('matching_score') or 0) * 100)}%")

    if result["cases_opened"]:
        st.subheader("Cases opened")
        for c in result["cases_opened"]:
            st.markdown(f"<div class='case-no'>{c['case_number']}</div>", unsafe_allow_html=True)
            st.header(c["title"])
            st.write(c.get("suggested_explanation"))
            st.markdown(pill(c.get("severity", ""), c.get("severity_score")), unsafe_allow_html=True)
            st.write("Drift: " + ", ".join(f"{t} drift" for t in (c.get("drift_types") or [])))
            if st.button("Enter hearing", key=f"enter_{c['id']}"):
                st.session_state.hearing_id = c["id"]
                st.session_state.pending_nav = "Hearing"
                st.rerun()
    else:
        st.info("No new contradiction met the bar for a case. Claims were filed against the registry.")


def page_hearing():
    dash = court().dashboard()
    options = dash["open_cases"] + dash["closed_cases"]
    if not options:
        st.write("No cases on the docket.")
        return
    default = st.session_state.get("hearing_id") or options[0]["id"]
    labels = {c["id"]: f"{c['case_number']} · {c['title']}" for c in options}
    choice = st.selectbox("Case", [c["id"] for c in options], index=next((i for i, c in enumerate(options) if c["id"] == default), 0), format_func=lambda i: labels.get(i, str(i)))
    st.session_state.hearing_id = choice
    c = court().assemble_case(choice)
    if not c:
        st.error("Case not found")
        return

    top = st.columns([4, 1])
    with top[0]:
        st.markdown(f"<div class='kicker'>{c['case_number']} · {(c.get('metric') or {}).get('name','')}</div>", unsafe_allow_html=True)
        st.title(c["title"])
        owner = (c.get("owner") or {}).get("name", "")
        st.markdown(f"Assigned to {owner} · Hearing by {c.get('deadline')} · " + pill(c.get("severity",""), c.get("severity_score")), unsafe_allow_html=True)
    if c.get("status") == "closed":
        top[1].markdown("<div class='stamp'>Verdict entered</div>", unsafe_allow_html=True)

    claims = c.get("claims") or []
    cols = st.columns(max(len(claims), 1))
    for col, claim in zip(cols, claims):
        with col:
            st.caption(f"Claim {claim.get('slot')} · {claim.get('speaker')}")
            st.markdown(f"<div class='claim-value'>{format_value(claim)}</div>", unsafe_allow_html=True)
            st.write(f"**Population.** {claim.get('population') or 'Not specified'}")
            st.write(f"**Source.** {claim.get('source_title') or claim.get('source_type')}")
            st.write(f"**Period.** {claim.get('period')} · {claim.get('country')} · {claim.get('product')}")

    left, right = st.columns([1.35, 0.75])
    with left:
        st.subheader("Detected differences")
        for d in c.get("detected_differences") or []:
            st.write(d)
        st.write(c.get("suggested_explanation"))
        st.subheader("Canonical definition")
        defn = c.get("current_definition")
        if defn:
            st.code(defn.get("formula") or "")
            pop = defn.get("population") or ""
            st.write(f"**Population.** {pop}")
            if not pop or "not specified" in pop.lower():
                st.warning("The registry does not specify eligibility treatment.")
            st.caption(defn.get("notes") or "")
        st.subheader("Prior precedent")
        for p in c.get("precedents") or []:
            st.markdown(f"**{p.get('title')}**")
            st.write(p.get("rule"))
        st.subheader("Witnesses & evidence")
        for e in c.get("evidence") or []:
            st.markdown(f"**{e.get('type')} · {e.get('title')}**")
            st.write(e.get("content"))
        if c.get("related_cases"):
            st.subheader("Related matters")
            for r in c["related_cases"]:
                st.markdown(f"<span class='case-no'>{r['case_number']}</span> {r['title']} · {r.get('status')}", unsafe_allow_html=True)

    with right:
        st.subheader("Verdict")
        if c.get("status") == "closed" and c.get("verdicts"):
            v = c["verdicts"][-1]
            st.markdown(f"### {v.get('statement')}")
            st.caption(f"{v.get('outcome')} · definition v{v.get('definition_version_created') or '—'} · {(v.get('issued_at') or '')[:16]}")
        else:
            outcomes = {
                "claim_a_authoritative": "Claim A is authoritative",
                "claim_b_authoritative": "Claim B is authoritative",
                "both_correct": "Both are correct under different definitions",
                "neither_supported": "Neither claim is supported",
                "canonical_amended": "Canonical definition must be amended",
                "more_evidence": "More evidence is required",
            }
            default_outcome = "both_correct" if (c.get("metric") or {}).get("canonical_id") == "M-RET-001" else "both_correct"
            outcome = st.radio("Outcome", list(outcomes), format_func=lambda k: outcomes[k], index=list(outcomes).index(default_outcome))
            statement = st.text_area("Statement", value=RETENTION_VERDICT["statement"] if (c.get("metric") or {}).get("canonical_id") == "M-RET-001" else (c.get("suggested_explanation") or ""), height=140)
            if st.button("Issue Verdict", type="primary"):
                payload = {"outcome": outcome, "statement": statement, "issued_by": 1}
                if outcome in ("both_correct", "canonical_amended"):
                    payload.update(RETENTION_VERDICT)
                    payload["outcome"] = outcome
                    payload["statement"] = statement
                    payload["amend_definition"] = True
                result = court().issue_verdict(c["id"], payload)
                bits = ["Verdict on file."]
                if result.get("definition"):
                    bits.append(f"Definition version {result['definition']['version']} written.")
                if result.get("alias"):
                    bits.append(f"Alias “{result['alias']['alias']}” stored.")
                if result.get("reassessed"):
                    bits.append("Closed related " + ", ".join(x["case_number"] for x in result["reassessed"]) + ".")
                st.success(" ".join(bits))
                st.rerun()


def page_registry():
    st.markdown("<div class='kicker'>Canonical metric registry</div>", unsafe_allow_html=True)
    st.title("A definition is not a verdict. It is the thing the verdict is about.")
    dash = court().dashboard()
    for m in dash["registry"]:
        with st.expander(f"{m['canonical_id']}  ·  {m['name']}", expanded=m["canonical_id"] == "M-RET-001"):
            st.markdown(pill(m.get("health_status", "")), unsafe_allow_html=True)
            st.write(f"**Owner.** {(m.get('owner') or {}).get('name')}")
            st.write(f"**Approved source.** {m.get('approved_source')}")
            d = m.get("current_definition") or {}
            st.code(d.get("formula") or "")
            st.write(f"**Population.** {d.get('population')}")
            st.write(f"**Calculation.** {d.get('calculation_type')}")
            st.write("**Aliases.** " + ", ".join(a["alias"] for a in m.get("aliases") or []))
            st.write("**Cases.** " + ", ".join(c["case_number"] for c in m.get("cases") or []) or "None")


def page_precedents():
    st.markdown("<div class='kicker'>Precedent library</div>", unsafe_allow_html=True)
    st.title("A closed case is only useful if the next disagreement can find it.")
    dash = court().dashboard()
    for p in dash["precedents"]:
        st.markdown(f"<span class='case-no'>{(p.get('case') or {}).get('case_number','')}</span>  ·  {(p.get('metric') or {}).get('name','')}  ·  {', '.join(p.get('applies_to_drift') or [])} drift", unsafe_allow_html=True)
        st.subheader(p.get("title") or "")
        st.write(p.get("rule"))
        st.divider()


def page_radar():
    st.markdown("<div class='kicker'>Drift radar</div>", unsafe_allow_html=True)
    dash = court().dashboard()
    st.title(dash["headline"])
    st.markdown("<p class='lede'>Not machine-learning data drift. Semantic metric drift: definition, value, time, scope, status, source.</p>", unsafe_allow_html=True)
    k = dash["kpis"]
    a, b, c, d = st.columns(4)
    a.metric("Open cases", k["open_cases"])
    b.metric("Critical", k["critical_cases"])
    c.metric("Days to verdict", k["avg_resolution_days"])
    d.metric("Closed", len(dash["closed_cases"]))

    series = dash["value_drift_series"]
    if series:
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=[s["date"] for s in series],
            y=[s["score"] for s in series],
            mode="lines+markers+text",
            text=[f"{s['case_number']} {s['score']}" for s in series],
            textposition="top center",
            line=dict(color="#8f1d2c", width=2),
            marker=dict(color="#8f1d2c", size=8),
        ))
        fig.update_layout(
            paper_bgcolor="#ffffff",
            plot_bgcolor="#ffffff",
            font=dict(color="#161513"),
            margin=dict(l=10, r=10, t=30, b=10),
            height=280,
            xaxis=dict(showgrid=False, zeroline=False),
            yaxis=dict(showgrid=False, zeroline=False, title="Severity"),
            showlegend=False,
        )
        st.plotly_chart(fig, width="stretch")

    left, right = st.columns(2)
    with left:
        st.subheader("Definition drift by team")
        teams = dash["definition_conflicts_by_team"]
        if teams:
            st.bar_chart(pd.DataFrame(teams).set_index("team"), color="#8f1d2c", horizontal=True)
    with right:
        st.subheader("Recurring drift types")
        if dash["recurring_drift"]:
            st.bar_chart(pd.Series(dash["recurring_drift"]), color="#8f1d2c", horizontal=True)
        st.subheader("Most frequently misunderstood")
        for row in dash["most_disputed"]:
            st.write(f"**{(row.get('metric') or {}).get('name')}** — {row['count']} cases")


if "pending_nav" in st.session_state:
    st.session_state.nav = st.session_state.pop("pending_nav")
backend = court()
st.sidebar.markdown("<div class='kicker'>Aether Credit</div>", unsafe_allow_html=True)
st.sidebar.title("Metric Court")
st.sidebar.caption("Organizational truth-resolution")
st.sidebar.markdown(
    f"<div class='kicker'>Court · {backend.name}</div>",
    unsafe_allow_html=True,
)
st.sidebar.caption(backend.detail)
nav = st.sidebar.radio(
    "Navigate",
    ["Docket", "Convene", "Hearing", "Registry", "Precedents", "Drift radar"],
    key="nav",
)
st.sidebar.markdown("---")
st.sidebar.write("**Priya Nair**")
st.sidebar.caption("Judge · Chief Data Officer")
if st.sidebar.button("Reset seeded demo"):
    try:
        reset_court()
        st.rerun()
    except Exception as exc:
        st.sidebar.error(str(exc))

{"Docket": page_docket, "Convene": page_convene, "Hearing": page_hearing, "Registry": page_registry, "Precedents": page_precedents, "Drift radar": page_radar}[nav]()
