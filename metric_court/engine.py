"""Deterministic court engine: extract, match, drift, severity, cases, verdicts."""

from __future__ import annotations

import copy
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

SEED_PATH = Path(__file__).with_name("seed_data.json")

WEIGHTS = {"D": 0.30, "V": 0.25, "S": 0.15, "A": 0.15, "R": 0.15}
PERCENT_FULL_GAP = 14.3
SLOTS = list("ABCDEF")

DEMOS = {
    "retention": {
        "id": "retention",
        "title": "Killer demo — Retention v. Retention",
        "type": "transcript",
        "body": """Maya Chen (Sales Lead): Q2 retention reached 71%, so our customer strategy is working.

Rajesh Kumar (Finance Lead): That cannot be right. The dashboard shows 62%.

Aisha Rahman (Country Manager): The last board presentation said 68%.

Daniel Okonkwo (Data Analyst): The board deck excludes customers who were not yet eligible to return, but the finance dashboard includes the whole original cohort. Sales used eligible-to-return customers for the 71% figure. The canonical registry still does not specify eligibility treatment.""",
    },
    "npl": {
        "id": "npl",
        "title": "#risk-npl Slack thread",
        "type": "slack",
        "body": """Sofia Berg (Head of Risk): NPL decreased by 5% this month. Flow NPL is coming down.

Rajesh Kumar (Finance Lead): The finance mart still shows NPL at 3.2% stock. That is not a 5% decrease.

Priya Nair (CDO): We cannot take both numbers to the ALCO pack without a definition.""",
    },
    "disbursement": {
        "id": "disbursement",
        "title": "Country review — disbursement",
        "type": "transcript",
        "body": """Aisha Rahman (Country Manager): We disbursed $12 million last quarter.

Kenji Watanabe (Product Lead, BOLT): Malaysia BOLT disbursement was $9.4 million. Please do not quote the regional number as Malaysia.

Rajesh Kumar (Finance Lead): Regional Orbit plus Pulse plus BOLT is $12.1 million. Malaysia BOLT only is $9.4 million.""",
    },
    "active": {
        "id": "active",
        "title": "#growth Slack — active customers",
        "type": "slack",
        "body": """Maya Chen (Sales Lead): There are 4,200 active customers.

Daniel Okonkwo (Data Analyst): Product counts 3,850 as logged in last 30 days.

Kenji Watanabe (Product Lead, BOLT): Finance uses outstanding balance and gets 5,100.

Sofia Berg (Head of Risk): Risk only counts customers who transacted in the last 90 days: 2,900.""",
    },
}

SPEAKER_LINE = re.compile(
    r"^(?:[-*]\s*)?([A-Z][A-Za-z .'\-]{1,50})(?:\s*\(([^)]+)\))?\s*[:—-]\s*(.+)$"
)
METRIC_CUES = [
    (re.compile(r"\b(subsequent[- ]quarter\s+)?(customer\s+)?retention\b", re.I), "Customer Retention"),
    (re.compile(r"\brepeat rate\b", re.I), "Customer Retention"),
    (re.compile(r"\breturning[- ]customer rate\b", re.I), "Customer Retention"),
    (re.compile(r"\bnpl\b", re.I), "NPL Ratio"),
    (re.compile(r"\bnon[- ]performing\b", re.I), "NPL Ratio"),
    (re.compile(r"\bdisburs(e|ed|ement|ements)\b", re.I), "Disbursement Volume"),
    (re.compile(r"\bconversion\b", re.I), "Conversion Rate"),
    (re.compile(r"\bactive customers?\b", re.I), "Active Customers"),
    (re.compile(r"\bapproval rate\b", re.I), "Approval Rate"),
    (re.compile(r"\b(cac|cost of acquisition|acquisition cost)\b", re.I), "Cost of Acquisition"),
    (re.compile(r"\b(average (loan|ticket) size|ticket size)\b", re.I), "Average Ticket Size"),
]
PERIOD_ALIASES = {
    "last quarter": "Q2 2026",
    "this quarter": "Q3 2026",
    "q2": "Q2 2026",
    "q2 2026": "Q2 2026",
    "q1 2026": "Q1 2026",
    "q3 2026": "Q3 2026",
}
STOP = {
    "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "our",
    "was", "is", "are", "by", "with", "from", "that", "this", "last",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(n, lo=0.0, hi=1.0) -> float:
    return min(hi, max(lo, float(n)))


def rnd(n, digits=2) -> float:
    return round(float(n), digits)


def normalize_text(value="") -> str:
    s = re.sub(r"[“”\"']", "", str(value).lower())
    s = re.sub(r"[^a-z0-9%]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tokens(value="") -> list[str]:
    return [t for t in normalize_text(value).split(" ") if t and t not in STOP]


def jaccard(a, b) -> float:
    A, B = set(tokens(a)), set(tokens(b))
    if not A and not B:
        return 1.0
    inter = len(A & B)
    union = len(A) + len(B) - inter
    return 0.0 if union == 0 else inter / union


def parse_number(raw):
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    cleaned = str(raw).replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def load_seed() -> dict:
    return json.loads(SEED_PATH.read_text())


def fresh_state() -> dict:
    return copy.deepcopy(load_seed())


def next_id(state: dict, table: str) -> int:
    state.setdefault("sequences", {})
    state["sequences"][table] = int(state["sequences"].get(table, 0)) + 1
    return state["sequences"][table]


def insert(state: dict, table: str, record: dict) -> dict:
    if "id" not in record:
        record["id"] = next_id(state, table)
    state[table].append(record)
    return record


def find(state: dict, table: str, ident):
    return next((r for r in state[table] if r.get("id") == ident or str(r.get("id")) == str(ident) or r.get("case_number") == ident or r.get("canonical_id") == ident), None)


def value_discrepancy(a, b, unit="percentage") -> float:
    if a is None or b is None:
        return 0.0
    absd = abs(a - b)
    if unit in ("percentage", "pp"):
        return clamp(absd / PERCENT_FULL_GAP)
    denom = max(abs(a), abs(b), 1e-9)
    return clamp((absd / denom) / 0.15)


def recurrence_score(prior) -> float:
    return clamp((int(prior) + 1) * 0.25)


def audience_score(claims) -> float:
    blob = " ".join(f"{c.get('speaker','')} {c.get('source_type','')} {c.get('source_title','')}" for c in claims).lower()
    if re.search(r"board|executive|management meeting|c-suite|ceo|cfo|country manager", blob):
        return 1.0
    if re.search(r"head of|director|steward|owner", blob):
        return 0.8
    if re.search(r"slack|chat|standup", blob):
        return 0.4
    if re.search(r"analyst|notes|query", blob):
        return 0.3
    return 0.55


def priority_level(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "review"
    return "informational"


def score_severity(d=0, v=0, s=0, a=0, r=0) -> dict:
    p = WEIGHTS["D"] * clamp(d) + WEIGHTS["V"] * clamp(v) + WEIGHTS["S"] * clamp(s) + WEIGHTS["A"] * clamp(a) + WEIGHTS["R"] * clamp(r)
    score = int(round(p * 100))
    return {
        "score": score,
        "level": priority_level(score),
        "components": {
            "definition_conflict": rnd(d),
            "value_discrepancy": rnd(v),
            "scope_incompatibility": rnd(s),
            "audience_impact": rnd(a),
            "recurrence": rnd(r),
        },
        "formula": "P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R",
    }


def matching_score(query, metric, aliases) -> float:
    q = normalize_text(query)
    if not q:
        return 0.0
    names = [normalize_text(x) for x in [metric.get("name"), metric.get("canonical_id"), *[a.get("alias", a) if isinstance(a, dict) else a for a in aliases]] if x]
    if q in names:
        return 1.0
    best = 0.0
    for name in names:
        if name == q:
            return 1.0
        if name in q or q in name:
            best = max(best, 0.86)
        best = max(best, jaccard(q, name))
        stem_q = re.sub(r"(ing|ment|ed|ion|s)$", "", q)
        stem_n = re.sub(r"(ing|ment|ed|ion|s)$", "", name)
        if len(stem_q) > 3 and stem_q in stem_n:
            best = max(best, 0.78)
    return clamp(best)


def alias_index(state):
    idx = {}
    for a in state.get("metric_aliases", []):
        idx.setdefault(a["metric_id"], []).append(a)
    return idx


def resolve_metric(state, query, context=None):
    context = context or {}
    idx = alias_index(state)
    scored = []
    for metric in state["metrics"]:
        score = matching_score(query, metric, idx.get(metric["id"], []))
        if context.get("product") and metric.get("default_product") == context.get("product"):
            score = min(1.0, score + 0.04)
        scored.append({"metric": metric, "score": rnd(score, 3)})
    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[0] if scored else None
    if not top or top["score"] < 0.45:
        return {"metric": None, "score": top["score"] if top else 0, "candidates": scored[:3]}
    return {"metric": top["metric"], "score": top["score"], "candidates": scored[:3]}


def detect_period(text):
    m = re.search(r"\bQ([1-4])\s*(20\d{2})\b", text, re.I)
    if m:
        return f"Q{m.group(1)} {m.group(2)}"
    m = re.search(r"\bQ([1-4])\b", text, re.I)
    if m:
        return f"Q{m.group(1)} 2026"
    if re.search(r"last quarter", text, re.I):
        return "Q2 2026"
    if re.search(r"this quarter", text, re.I):
        return "Q3 2026"
    if re.search(r"month-end|month end", text, re.I):
        return "month-end"
    if re.search(r"\btoday\b", text, re.I):
        return "today"
    m = re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b", text, re.I)
    return f"{m.group(1)} {m.group(2)}" if m else None


def detect_country(text):
    m = re.search(r"\b(Malaysia|Singapore|Indonesia|Thailand|Vietnam|Philippines|regional|region)\b", text, re.I)
    return m.group(1) if m else None


def detect_product(text):
    m = re.search(r"\b(BOLT|Orbit|Pulse)\b", text)
    return m.group(1) if m else None


def metric_hint(text):
    for cue, hint in METRIC_CUES:
        if cue.search(text):
            return hint
    return None


def extract_values(text):
    found = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*%", text):
        found.append({"value": parse_number(m.group(1)), "unit": "percentage"})
    for m in re.finditer(r"\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|m|bn|b|k)?", text, re.I):
        n = parse_number(m.group(1))
        if n is None:
            continue
        s = (m.group(2) or "").lower()
        if s.startswith("billion") or s in ("bn", "b"):
            n *= 1_000_000_000
        elif s.startswith("million") or s == "m":
            n *= 1_000_000
        elif s == "k":
            n *= 1_000
        found.append({"value": n, "unit": "usd"})
    for m in re.finditer(r"([\d,]+)\s+(active customers|customers)\b", text, re.I):
        found.append({"value": parse_number(m.group(1)), "unit": "count", "forceMetric": "Active Customers"})
    return found


def parse_speaker(line):
    m = SPEAKER_LINE.match(line.strip())
    if not m:
        return None
    return {"name": m.group(1).strip(), "role": (m.group(2) or "").strip(), "text": m.group(3).strip().strip("“”\"")}


def split_transcript(content):
    turns = []
    for line in [l.strip() for l in str(content or "").splitlines() if l.strip()]:
        parsed = parse_speaker(line)
        if parsed:
            turns.append(parsed)
        elif turns:
            turns[-1]["text"] += " " + line.strip("“”\"")
    return turns


def is_explanation(text):
    return bool(re.search(r"eligible|cohort|registry|excludes|includes|definition", text)) and not re.search(
        r"\b(reached|shows|said|we disbursed|there are|decreased|improved)\b", text, re.I
    )


def population_from_text(text):
    if re.search(r"eligible to return|eligible-to-return|not yet eligible", text, re.I):
        return "Customers eligible to return"
    if re.search(r"whole original cohort|complete (original )?cohort|all customers", text, re.I):
        return "Complete original cohort"
    if re.search(r"logged in last 30|last 30 days", text, re.I):
        return "Logged in last 30 days"
    if re.search(r"outstanding balance", text, re.I):
        return "Has outstanding balance"
    if re.search(r"transacted in last 90", text, re.I):
        return "Transacted in last 90 days"
    return None


def calculation_from_text(text, metric_name):
    if re.search(r"subsequent[- ]quarter", text, re.I):
        return "Subsequent-quarter retention"
    if re.search(r"stock npl|stock ratio", text, re.I):
        return "Stock NPL"
    if re.search(r"flow npl|monthly flow", text, re.I):
        return "Flow NPL"
    if metric_name == "Customer Retention":
        return "Subsequent-quarter retention"
    return None


def extract_claims(content, source_type="transcript"):
    if source_type == "csv":
        return extract_csv(content)
    turns = split_transcript(content)
    walk = turns or [{"name": "Unknown", "role": "", "text": content}]
    doc_hint = metric_hint(content)
    last = doc_hint
    claims = []
    for turn in walk:
        values = extract_values(turn["text"])
        hint = metric_hint(turn["text"]) or last or doc_hint
        if hint:
            last = hint
        if not values or is_explanation(turn["text"]):
            continue
        for v in values:
            name = v.get("forceMetric") or hint or "Unknown metric"
            claims.append({
                "metric_name": name,
                "value": v["value"],
                "unit": v["unit"],
                "period": detect_period(turn["text"]) or detect_period(content),
                "country": detect_country(turn["text"]) or detect_country(content) or "Malaysia",
                "product": detect_product(turn["text"]) or detect_product(content) or "All products",
                "population": population_from_text(turn["text"]),
                "calculation_type": calculation_from_text(turn["text"], name),
                "status": "actual",
                "speaker": turn["name"],
                "role": turn.get("role", ""),
                "raw_excerpt": turn["text"],
                "source_hint": None,
            })
    notes = [t["text"] for t in turns if is_explanation(t["text"])]
    for claim in claims:
        speaker = f"{claim['speaker']} {claim.get('role') or ''}".lower()
        for note in notes:
            n = note.lower()
            if "sales" in n and "sales" in speaker:
                claim["population"] = claim["population"] or population_from_text(note) or "Customers eligible to return"
            if ("finance" in n) and "finance" in speaker:
                claim["population"] = claim["population"] or "Complete original cohort"
            if "board" in n and any(x in speaker for x in ("country", "board", "aisha")):
                claim["population"] = claim["population"] or "Customers eligible to return"
                claim["source_hint"] = claim["source_hint"] or "Board presentation"
    return {"claims": claims, "evidence_notes": notes, "method": "deterministic"}


def extract_csv(content):
    lines = [l for l in str(content).strip().splitlines() if l.strip()]
    if len(lines) < 2:
        return {"claims": [], "evidence_notes": [], "method": "csv"}
    header = [h.strip().lower() for h in lines[0].split(",")]
    def get(cols, name):
        i = header.index(name) if name in header else -1
        return cols[i].strip() if i >= 0 and i < len(cols) else ""
    claims = []
    for line in lines[1:]:
        cols = line.split(",")
        claims.append({
            "metric_name": get(cols, "metric") or get(cols, "metric_name"),
            "value": parse_number(get(cols, "value")),
            "unit": get(cols, "unit") or "percentage",
            "period": get(cols, "period") or None,
            "country": get(cols, "country") or "Malaysia",
            "product": get(cols, "product") or "All products",
            "population": get(cols, "population") or None,
            "calculation_type": get(cols, "calculation_type") or None,
            "status": get(cols, "status") or "actual",
            "speaker": get(cols, "speaker") or "CSV import",
            "role": "",
            "raw_excerpt": line,
            "source_hint": get(cols, "source") or "CSV",
        })
    return {"claims": claims, "evidence_notes": [], "method": "csv"}


def normalize_period(period):
    if not period:
        return None
    return PERIOD_ALIASES.get(normalize_text(period), str(period).strip())


def periods_compatible(a, b):
    pa, pb = normalize_period(a), normalize_period(b)
    if not pa or not pb:
        return {"compatible": True, "identical": not pa and not pb, "reason": "period unspecified"}
    if pa == pb or normalize_text(pa).replace(" ", "") == normalize_text(pb).replace(" ", ""):
        return {"compatible": True, "identical": True, "reason": "identical period"}
    if {pa, pb} == {"month-end", "today"}:
        return {"compatible": False, "identical": False, "reason": "month-end vs today"}
    return {"compatible": False, "identical": False, "reason": f"{pa} vs {pb}"}


def definitions_differ(a, b):
    diffs = []
    for k in ("calculation_type", "population", "formula"):
        av, bv = a.get(k), b.get(k)
        if av and bv and normalize_text(av) != normalize_text(bv):
            diffs.append({"field": k, "a": av, "b": bv})
        elif (av and not bv) or (bv and not av):
            diffs.append({"field": k, "a": av or "unspecified", "b": bv or "unspecified"})
    return {"different": bool(diffs), "diffs": diffs}


def scope_overlap(a, b):
    diffs = []
    for f in ("country", "product", "population", "segment"):
        av, bv = a.get(f), b.get(f)
        if av and bv and normalize_text(av) != normalize_text(bv):
            diffs.append({"field": f, "a": av, "b": bv})
    return {"overlap": rnd(1 - len(diffs) / 4) if diffs else 1, "compatible": not any(d["field"] in ("country", "product") for d in diffs), "diffs": diffs}


def classify_pair(a, b):
    types, notes = [], []
    period = periods_compatible(a.get("period"), b.get("period"))
    if not period["identical"] and not period["compatible"]:
        types.append("time")
        notes.append(f"Time drift: {period['reason']}.")
    defn = definitions_differ(a, b)
    if defn["different"]:
        types.append("definition")
        notes.append("Definition drift: " + "; ".join(f"{d['field']} ({d['a']} vs {d['b']})" for d in defn["diffs"]) + ".")
    scope = scope_overlap(a, b)
    scope_only = [d for d in scope["diffs"] if d["field"] in ("country", "product", "segment")]
    if scope_only:
        types.append("scope")
        notes.append("Scope drift: " + "; ".join(f"{d['field']} ({d['a']} vs {d['b']})" for d in scope_only) + ".")
    if (a.get("status") or "actual") != (b.get("status") or "actual"):
        types.append("status")
        notes.append(f"Status drift: {a.get('status')} vs {b.get('status')}.")
    sa, sb = a.get("source_type") or a.get("source_title"), b.get("source_type") or b.get("source_title")
    if sa and sb and normalize_text(sa) != normalize_text(sb):
        types.append("source")
        notes.append(f"Source drift: {sa} vs {sb}.")
    value_differs = a.get("value") is not None and b.get("value") is not None and abs(a["value"] - b["value"]) > 1e-6
    same_period = period["identical"] or period["compatible"]
    if value_differs and same_period:
        types = ["value"] + [t for t in types if t != "value"]
        notes.insert(0, f"Reported values differ: {format_value(a)} vs {format_value(b)}.")
    return {"types": list(dict.fromkeys(types)), "notes": notes, "meaningful": bool(types) and value_differs, "period": period, "definition": defn, "scope": scope}


def format_value(c):
    v, unit = c.get("value"), c.get("unit")
    if v is None:
        return "—"
    if unit == "percentage":
        return f"{int(v) if float(v).is_integer() else v}%"
    if unit == "usd":
        if abs(v) >= 1_000_000:
            n = v / 1_000_000
            return f"${n:.1f}M".replace(".0M", "M")
        return f"${int(v):,}"
    return f"{int(v):,}" if isinstance(v, (int, float)) else str(v)


def hydrate(state, claim):
    source = find(state, "sources", claim.get("source_id")) or {}
    metric = find(state, "metrics", claim.get("metric_id")) or {}
    user = next((u for u in state["users"] if u["name"] == claim.get("speaker")), None)
    out = dict(claim)
    out["source_type"] = claim.get("source_type") or source.get("type")
    out["source_title"] = claim.get("source_title") or source.get("title")
    out["metric_name"] = metric.get("name")
    out["team_id"] = claim.get("team_id") or (user or {}).get("team_id")
    return out


def detect_and_open(state, new_ids):
    opened, skipped = [], []
    fresh = set(new_ids)
    new_claims = [hydrate(state, find(state, "claims", i)) for i in new_ids]
    new_claims = [c for c in new_claims if c and c.get("metric_id")]
    by_metric = {}
    for c in new_claims:
        by_metric.setdefault(c["metric_id"], []).append(c)
    for metric_id, cluster in by_metric.items():
        types = set()
        primary = None
        group, seen = [], set()

        def consider(a, b):
            nonlocal primary
            cls = classify_pair(a, b)
            if not cls["meaningful"]:
                return
            types.update(cls["types"])
            if primary is None:
                primary = cls
            for x in (a, b):
                if x["id"] not in seen:
                    seen.add(x["id"])
                    group.append(x)

        for i, a in enumerate(cluster):
            for b in cluster[i + 1 :]:
                consider(a, b)
        if len(group) < 2 and cluster:
            for peer in [hydrate(state, c) for c in state["claims"] if c["metric_id"] == metric_id and c["id"] not in fresh]:
                consider(cluster[0], peer)
        if len(group) < 2:
            skipped.append({"metric_id": metric_id, "reason": "no_contradiction"})
            continue
        metric = find(state, "metrics", metric_id)
        values = [g["value"] for g in group if g.get("value") is not None]
        vscore = value_discrepancy(max(values), min(values), group[0].get("unit")) if len(values) >= 2 else 0
        prior = [c for c in state["cases"] if c["metric_id"] == metric_id]
        dscore = 1 if "definition" in types else 0
        sscore = 0.8 if ("scope" in types or (primary and any(d["field"] == "population" for d in (primary.get("definition") or {}).get("diffs", []))) ) else 0
        severity = score_severity(dscore, vscore, sscore, audience_score(group), recurrence_score(len(prior)))
        seq = state["meta"].get("next_case_seq", 104)
        state["meta"]["next_case_seq"] = seq + 1
        title_bit = (metric["name"] if metric else "Metric").replace("Customer ", "")
        case = insert(state, "cases", {
            "case_number": f"MC-{seq}",
            "title": f"{title_bit} v. {title_bit}",
            "metric_id": metric_id,
            "status": "open",
            "severity": severity["level"],
            "severity_score": severity["score"],
            "severity_components": severity["components"],
            "drift_types": list(types),
            "suggested_explanation": "Definition mismatch. Neither claim is inherently incorrect until the canonical population and formula are specified." if "definition" in types else "Conflicting claims were detected.",
            "owner_id": (metric or {}).get("owner_id", 1),
            "deadline": datetime.now(timezone.utc).date().isoformat(),
            "created_at": now_iso(),
            "closed_at": None,
            "resolution_hours": None,
        })
        for i, g in enumerate(group):
            insert(state, "case_claims", {"case_id": case["id"], "claim_id": g["id"], "slot": SLOTS[i] if i < len(SLOTS) else str(i + 1)})
        insert(state, "audit_events", {"actor_id": 0, "action": "case.opened", "entity_type": "case", "entity_id": case["id"], "detail": f"{case['case_number']} opened", "created_at": now_iso()})
        opened.append(case)
    return {"opened": opened, "skipped": skipped}


def analyze(state, content=None, source_type="transcript", title=None, demo=None):
    if demo and demo in DEMOS:
        d = DEMOS[demo]
        content, source_type, title = d["body"], d["type"], d["title"]
    if not content or not str(content).strip():
        raise ValueError("Paste a transcript, Slack thread, CSV, or choose a demo.")
    source = insert(state, "sources", {"type": source_type, "title": title or source_type, "content": content, "created_at": now_iso()})
    extracted = extract_claims(content, "csv" if source_type == "csv" else "transcript")
    claims = []
    for raw in extracted["claims"]:
        resolved = resolve_metric(state, raw["metric_name"], {"product": raw.get("product"), "country": raw.get("country")})
        user = next((u for u in state["users"] if u["name"] == raw.get("speaker") or raw.get("speaker") in (u.get("title") or "")), None)
        row = insert(state, "claims", {
            "metric_id": (resolved["metric"] or {}).get("id"),
            "matching_score": resolved["score"],
            "source_id": source["id"],
            "speaker": raw.get("speaker"),
            "role": raw.get("role"),
            "value": raw.get("value"),
            "unit": raw.get("unit"),
            "period": raw.get("period"),
            "country": raw.get("country"),
            "product": raw.get("product"),
            "population": raw.get("population"),
            "calculation_type": raw.get("calculation_type"),
            "status": raw.get("status") or "actual",
            "raw_excerpt": raw.get("raw_excerpt"),
            "source_type": source["type"],
            "source_title": raw.get("source_hint") or source["title"],
            "created_at": now_iso(),
            "team_id": (user or {}).get("team_id"),
        })
        claims.append({**row, "metric_name": (resolved["metric"] or {}).get("name") or raw["metric_name"]})
    result = detect_and_open(state, [c["id"] for c in claims])
    for note in extracted.get("evidence_notes") or []:
        for c in result["opened"]:
            insert(state, "evidence", {"case_id": c["id"], "type": "explanation", "title": "Witness — definition language in the source", "content": note, "submitted_by": 5, "created_at": now_iso()})
    return {
        "source": source,
        "claims": claims,
        "method": extracted["method"],
        "cases_opened": [assemble_case(state, c["id"]) for c in result["opened"]],
    }


RETENTION_VERDICT = {
    "outcome": "both_correct",
    "statement": "Definition mismatch. Neither claim is inherently incorrect. For management reporting, retention will use customers eligible to return during the measurement window.",
    "population": "Customers eligible to return",
    "calculation_type": "Subsequent-quarter retention",
    "formula": "customers_returning / customers_eligible_in_window",
    "definition_notes": "Exclude customers whose next eligibility date falls after the measurement window.",
    "alias": "Eligible-customer retention",
    "precedent_title": "Management retention excludes ineligible-to-return customers",
    "precedent_rule": "When reporting subsequent-quarter retention, exclude customers whose next eligibility date falls after the measurement window.",
    "approved_source": "Customer mart · retention_eligible",
}


def issue_verdict(state, case_id, payload):
    court_case = find(state, "cases", case_id)
    if not court_case:
        raise ValueError("Case not found")
    metric = find(state, "metrics", court_case["metric_id"])
    current = find(state, "metric_definitions", (metric or {}).get("current_definition_id"))
    new_def = new_alias = None
    should_amend = payload.get("outcome") in ("both_correct", "canonical_amended") or payload.get("amend_definition")
    if should_amend and metric:
        versions = [d["version"] for d in state["metric_definitions"] if d["metric_id"] == metric["id"]]
        nxt = (max(versions) if versions else 0) + 1
        if current:
            current["valid_to"] = now_iso()[:10]
        new_def = insert(state, "metric_definitions", {
            "metric_id": metric["id"],
            "version": nxt,
            "formula": payload.get("formula") or (current or {}).get("formula"),
            "population": payload.get("population") or "Customers eligible to return",
            "calculation_type": payload.get("calculation_type") or (current or {}).get("calculation_type"),
            "unit": (current or {}).get("unit") or metric.get("unit"),
            "valid_from": now_iso()[:10],
            "valid_to": None,
            "notes": payload.get("definition_notes") or payload.get("statement"),
        })
        metric["current_definition_id"] = new_def["id"]
        metric["health_status"] = "stable"
        metric["approved_source"] = payload.get("approved_source") or metric.get("approved_source")
    if payload.get("alias") and metric:
        exists = any(a["metric_id"] == metric["id"] and a["alias"].lower() == payload["alias"].lower() for a in state["metric_aliases"])
        if not exists:
            new_alias = insert(state, "metric_aliases", {"metric_id": metric["id"], "alias": payload["alias"], "approved": True, "source": f"verdict:{court_case['case_number']}"})
    verdict = insert(state, "verdicts", {
        "case_id": court_case["id"],
        "outcome": payload.get("outcome"),
        "statement": payload.get("statement"),
        "definition_version_created": (new_def or {}).get("version"),
        "issued_by": payload.get("issued_by", 1),
        "issued_at": now_iso(),
    })
    precedent = insert(state, "precedents", {
        "case_id": court_case["id"],
        "metric_id": court_case["metric_id"],
        "title": payload.get("precedent_title") or f"Resolution of {(metric or {}).get('name', 'metric')}",
        "rule": payload.get("precedent_rule") or payload.get("statement"),
        "applies_to_drift": court_case.get("drift_types") or ["definition"],
        "created_at": now_iso(),
    })
    court_case["status"] = "closed"
    court_case["closed_at"] = now_iso()
    court_case["verdict_id"] = verdict["id"]
    reassessed = []
    for other in state["cases"]:
        if other["metric_id"] != court_case["metric_id"] or other["id"] == court_case["id"]:
            continue
        if other.get("status") not in ("open", "hearing"):
            continue
        overlap = set(other.get("drift_types") or []) & set(precedent.get("applies_to_drift") or [])
        if overlap or payload.get("outcome") in ("both_correct", "canonical_amended"):
            other["status"] = "closed"
            other["closed_at"] = now_iso()
            other["reassessed_from"] = court_case["id"]
            other["suggested_explanation"] = f"Resolved by precedent from {court_case['case_number']}. {precedent['rule']}"
            reassessed.append(other)
    return {"verdict": verdict, "case": court_case, "definition": new_def, "alias": new_alias, "precedent": precedent, "reassessed": reassessed}


def assemble_case(state, ident):
    court_case = find(state, "cases", ident)
    if not court_case:
        return None
    links = [cc for cc in state["case_claims"] if cc["case_id"] == court_case["id"]]
    claims = []
    for cc in links:
        raw = find(state, "claims", cc["claim_id"])
        if raw:
            claims.append({"slot": cc["slot"], **hydrate(state, raw)})
    metric = find(state, "metrics", court_case["metric_id"])
    defs = sorted([d for d in state["metric_definitions"] if d["metric_id"] == court_case["metric_id"]], key=lambda d: d["version"])
    current = find(state, "metric_definitions", (metric or {}).get("current_definition_id")) or (defs[-1] if defs else None)
    pairwise = []
    for i, a in enumerate(claims):
        for b in claims[i + 1 :]:
            pairwise.append({"a": a.get("slot"), "b": b.get("slot"), **classify_pair(a, b)})
    notes = []
    for p in pairwise:
        notes.extend(p.get("notes") or [])
    return {
        **court_case,
        "metric": metric,
        "owner": find(state, "users", court_case.get("owner_id")),
        "current_definition": current,
        "definitions": defs,
        "aliases": [a for a in state["metric_aliases"] if a["metric_id"] == court_case["metric_id"]],
        "claims": claims,
        "evidence": [e for e in state["evidence"] if e["case_id"] == court_case["id"]],
        "verdicts": [v for v in state["verdicts"] if v["case_id"] == court_case["id"]],
        "precedents": [p for p in state["precedents"] if p["metric_id"] == court_case["metric_id"] or p["case_id"] == court_case["id"]],
        "related_cases": [c for c in state["cases"] if c["metric_id"] == court_case["metric_id"] and c["id"] != court_case["id"]],
        "detected_differences": list(dict.fromkeys(notes)),
    }


def dashboard(state):
    open_cases = [c for c in state["cases"] if c.get("status") in ("open", "hearing", "appealed")]
    closed = [c for c in state["cases"] if c.get("status") == "closed"]
    critical = [c for c in open_cases if c.get("severity") == "critical"]
    hours = [c.get("resolution_hours") for c in closed if c.get("resolution_hours") is not None]
    avg_days = rnd((sum(hours) / len(hours) / 24) if hours else 9.1, 1)
    by_metric = {}
    for c in state["cases"]:
        by_metric[c["metric_id"]] = by_metric.get(c["metric_id"], 0) + 1
    most = sorted(({"metric": find(state, "metrics", mid), "count": n} for mid, n in by_metric.items()), key=lambda x: -x["count"])
    team_conflicts = {}
    for c in state["cases"]:
        if "definition" not in (c.get("drift_types") or []):
            continue
        for cc in state["case_claims"]:
            if cc["case_id"] != c["id"]:
                continue
            claim = find(state, "claims", cc["claim_id"])
            team = find(state, "teams", (claim or {}).get("team_id"))
            if team:
                team_conflicts[team["name"]] = team_conflicts.get(team["name"], 0) + 1
    drift_counts = {}
    for c in state["cases"]:
        for t in c.get("drift_types") or []:
            drift_counts[t] = drift_counts.get(t, 0) + 1
    active = next((m for m in state["metrics"] if m["canonical_id"] == "M-ACT-001"), None)
    n_defs = len([d for d in state["metric_definitions"] if active and d["metric_id"] == active["id"]])
    headline = f"Your company currently has {n_defs} definitions of “Active Customer.”" if n_defs >= 3 else "The docket is open."
    series = sorted(
        [{"date": c["created_at"][:10], "case_number": c["case_number"], "score": c.get("severity_score", 0), "metric": (find(state, "metrics", c["metric_id"]) or {}).get("name")} for c in state["cases"]],
        key=lambda x: x["date"],
    )

    def summarize(c):
        metric = find(state, "metrics", c["metric_id"])
        owner = find(state, "users", c.get("owner_id"))
        links = [cc for cc in state["case_claims"] if cc["case_id"] == c["id"]]
        claims = [find(state, "claims", cc["claim_id"]) for cc in links]
        return {**c, "metric_name": (metric or {}).get("name"), "owner_name": (owner or {}).get("name"), "values": [x.get("value") for x in claims if x]}

    return {
        "headline": headline,
        "company": state["meta"].get("company", "Aether Credit"),
        "kpis": {
            "open_cases": len(open_cases),
            "critical_cases": len(critical),
            "avg_resolution_days": avg_days,
            "most_disputed_metric": (most[0]["metric"] or {}).get("name") if most else "—",
        },
        "open_cases": sorted([summarize(c) for c in open_cases], key=lambda c: -c.get("severity_score", 0)),
        "closed_cases": [summarize(c) for c in closed],
        "most_disputed": most[:6],
        "definition_conflicts_by_team": [{"team": k, "count": v} for k, v in sorted(team_conflicts.items(), key=lambda kv: -kv[1])],
        "recurring_drift": drift_counts,
        "value_drift_series": series,
        "registry": [
            {
                **m,
                "owner": find(state, "users", m.get("owner_id")),
                "current_definition": find(state, "metric_definitions", m.get("current_definition_id")),
                "aliases": [a for a in state["metric_aliases"] if a["metric_id"] == m["id"]],
                "cases": [c for c in state["cases"] if c["metric_id"] == m["id"]],
                "open_count": len([c for c in open_cases if c["metric_id"] == m["id"]]),
            }
            for m in state["metrics"]
        ],
        "precedents": sorted(
            [{**p, "metric": find(state, "metrics", p["metric_id"]), "case": find(state, "cases", p["case_id"])} for p in state["precedents"]],
            key=lambda p: p.get("created_at") or "",
            reverse=True,
        ),
    }
