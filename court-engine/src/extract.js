/**
 * Deterministic claim extraction.
 *
 * The LLM (when available) only detects mentions, extracts value/period/scope,
 * suggests a canonical match, and explains ambiguous language. It never
 * issues a verdict. This extractor is the always-on fallback so the killer
 * demo works without an API key.
 */

import { parseNumber, unique } from "./util.js";

const SPEAKER_LINE = /^(?:[-*]\s*)?([A-Z][A-Za-z .'\-]{1,50})(?:\s*\(([^)]+)\))?\s*[:—-]\s*(.+)$/;

const METRIC_CUES = [
  { cue: /\b(subsequent[- ]quarter\s+)?(customer\s+)?retention\b/i, hint: "Customer Retention" },
  { cue: /\brepeat rate\b/i, hint: "Customer Retention" },
  { cue: /\breturning[- ]customer rate\b/i, hint: "Customer Retention" },
  { cue: /\bnpl\b/i, hint: "NPL Ratio" },
  { cue: /\bnon[- ]performing\b/i, hint: "NPL Ratio" },
  { cue: /\bdisburs(e|ed|ement|ements)\b/i, hint: "Disbursement Volume" },
  { cue: /\bconversion\b/i, hint: "Conversion Rate" },
  { cue: /\bactive customers?\b/i, hint: "Active Customers" },
  { cue: /\bapproval rate\b/i, hint: "Approval Rate" },
  { cue: /\b(cac|cost of acquisition|acquisition cost)\b/i, hint: "Cost of Acquisition" },
  { cue: /\b(average (loan|ticket) size|ticket size)\b/i, hint: "Average Ticket Size" },
];

function detectPeriod(text) {
  const q = text.match(/\bQ([1-4])\s*(20\d{2})\b/i);
  if (q) return `Q${q[1]} ${q[2]}`;
  const qBare = text.match(/\bQ([1-4])\b/i);
  if (qBare) return `Q${qBare[1]} 2026`;
  if (/last quarter/i.test(text)) return "Q2 2026";
  if (/this quarter/i.test(text)) return "Q3 2026";
  if (/month-end|month end/i.test(text)) return "month-end";
  if (/\btoday\b/i.test(text)) return "today";
  const month = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );
  if (month) return `${month[1]} ${month[2]}`;
  return null;
}

function detectCountry(text) {
  const m = text.match(/\b(Malaysia|Singapore|Indonesia|Thailand|Vietnam|Philippines|regional|region)\b/i);
  return m ? m[1] : null;
}

function detectProduct(text) {
  const m = text.match(/\b(BOLT|Orbit|Pulse)\b/);
  return m ? m[1] : null;
}

function detectUnitAndScale(raw, suffix) {
  const n = parseNumber(raw);
  if (n == null) return null;
  const s = (suffix || "").toLowerCase();
  if (s.startsWith("billion") || s === "bn" || s === "b") return { value: n * 1_000_000_000, unit: "usd", display: n };
  if (s.startsWith("million") || s === "m") return { value: n * 1_000_000, unit: "usd", display: n };
  if (s === "k") return { value: n * 1_000, unit: "usd", display: n };
  return { value: n, unit: "usd", display: n };
}

function metricHint(text) {
  for (const { cue, hint } of METRIC_CUES) {
    if (cue.test(text)) return hint;
  }
  return null;
}

function extractValues(text) {
  const found = [];
  const pct = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  for (const m of pct) {
    found.push({
      value: parseNumber(m[1]),
      unit: "percentage",
      span: m[0],
      index: m.index,
    });
  }
  const money = [...text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|m|bn|b|k)?/gi)];
  for (const m of money) {
    const scaled = detectUnitAndScale(m[1], m[2]);
    if (!scaled) continue;
    found.push({
      value: scaled.value,
      unit: "usd",
      span: m[0],
      index: m.index,
    });
  }
  const count = [...text.matchAll(/([\d,]+)\s+(active customers|customers)\b/gi)];
  for (const m of count) {
    found.push({
      value: parseNumber(m[1]),
      unit: "count",
      span: m[0],
      index: m.index,
      forceMetric: "Active Customers",
    });
  }
  return found;
}

function parseSpeaker(line) {
  const m = line.trim().match(SPEAKER_LINE);
  if (!m) return null;
  const name = m[1].trim();
  const role = (m[2] || "").trim();
  const text = m[3].replace(/^[“"]|[”"]$/g, "").trim();
  return { name, role, text, line };
}

function splitTranscript(content) {
  const lines = String(content || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const turns = [];
  for (const line of lines) {
    const parsed = parseSpeaker(line);
    if (parsed) turns.push(parsed);
    else if (turns.length) turns[turns.length - 1].text += " " + line.replace(/^[“"]|[”"]$/g, "");
  }
  return turns;
}

function isExplanationTurn(text) {
  return (
    /eligible|cohort|registry|excludes|includes|definition/.test(text) &&
    !/\b(reached|shows|said|we disbursed|there are|decreased|improved)\b/i.test(text)
  );
}

function populationFromText(text) {
  if (/eligible to return|eligible-to-return|not yet eligible/i.test(text)) {
    return "Customers eligible to return";
  }
  if (/whole original cohort|complete (original )?cohort|all customers/i.test(text)) {
    return "Complete original cohort";
  }
  if (/logged in last 30|last 30 days/i.test(text)) return "Logged in last 30 days";
  if (/outstanding balance/i.test(text)) return "Has outstanding balance";
  if (/transacted in last 90/i.test(text)) return "Transacted in last 90 days";
  return null;
}

function calculationFromText(text, metricName) {
  if (/subsequent[- ]quarter/i.test(text)) return "Subsequent-quarter retention";
  if (/stock npl|stock ratio/i.test(text)) return "Stock NPL";
  if (/flow npl|monthly flow/i.test(text)) return "Flow NPL";
  if (/approved/i.test(text) && /disburs/i.test(text)) return null;
  if (metricName === "Customer Retention") return "Subsequent-quarter retention";
  return null;
}

function statusFromText(text) {
  if (/\bforecast|projected|we expect\b/i.test(text)) return "forecast";
  if (/\bapproved\b/i.test(text) && !/\bdisbursed|completed\b/i.test(text)) return "approved";
  if (/\bdisbursed|completed\b/i.test(text)) return "completed";
  return "actual";
}

/**
 * Second pass: attach definition language from explanatory turns
 * to the claims they refer to (sales / finance / board).
 */
function enrichFromExplanations(claims, turns) {
  const explanations = turns.filter((t) => isExplanationTurn(t.text));
  const notes = explanations.map((t) => t.text);
  for (const claim of claims) {
    const speaker = `${claim.speaker} ${claim.role || ""}`.toLowerCase();
    for (const note of notes) {
      if (/sales/.test(note) && /sales/.test(speaker)) {
        claim.population = claim.population || populationFromText(note) || "Customers eligible to return";
      }
      if (/finance dashboard|finance/.test(note) && /finance/.test(speaker)) {
        claim.population = claim.population || "Complete original cohort";
      }
      if (/board/.test(note) && /country|board|aisha/.test(speaker)) {
        claim.population = claim.population || "Customers eligible to return";
        claim.source_hint = claim.source_hint || "Board presentation";
      }
    }
    if (!claim.ambiguity && notes.length) {
      claim.ambiguity = notes.join(" ");
    }
  }
  return { claims, evidenceNotes: notes, explanationTurns: explanations };
}

export function extractClaimsFromText(content, sourceType = "transcript") {
  if (sourceType === "csv") return extractClaimsFromCsv(content);

  const turns = splitTranscript(content);
  const claims = [];
  const ambiguous = [];

  const walk = turns.length ? turns : [{ name: "Unknown", role: "", text: content, line: content }];
  const documentHint = metricHint(content);
  let lastHint = documentHint;

  for (const turn of walk) {
    const values = extractValues(turn.text);
    const hint = metricHint(turn.text) || lastHint || documentHint;
    if (hint) lastHint = hint;
    if (!values.length) {
      if (hint) {
        ambiguous.push({
          speaker: turn.name,
          text: turn.text,
          reason: "Metric mentioned without a numeric value.",
        });
      }
      continue;
    }
    if (isExplanationTurn(turn.text)) {
      continue;
    }
    for (const v of values) {
      const metric_name = v.forceMetric || hint || metricHint(turn.text) || "Unknown metric";
      if (metric_name === "Unknown metric") {
        ambiguous.push({
          speaker: turn.name,
          text: turn.text,
          reason: "Numeric claim with no recognizable metric name.",
        });
      }
      claims.push({
        metric_name,
        value: v.value,
        unit: v.unit,
        period: detectPeriod(turn.text) || detectPeriod(content) || null,
        country: detectCountry(turn.text) || detectCountry(content) || "Malaysia",
        product: detectProduct(turn.text) || detectProduct(content) || "All products",
        population: populationFromText(turn.text),
        calculation_type: calculationFromText(turn.text, metric_name),
        status: statusFromText(turn.text),
        speaker: turn.name,
        role: turn.role,
        raw_excerpt: turn.text,
        source_hint: null,
        ambiguity: null,
      });
    }
  }

  const enriched = enrichFromExplanations(claims, turns);
  return {
    claims: enriched.claims,
    ambiguous,
    evidence_notes: enriched.evidenceNotes,
    explanation_turns: enriched.explanationTurns,
    method: "deterministic",
  };
}

export function extractClaimsFromCsv(content) {
  const lines = String(content || "")
    .trim()
    .split(/\n/);
  if (lines.length < 2) return { claims: [], ambiguous: [], evidence_notes: [], method: "csv" };
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const claims = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",").map((c) => c.trim());
    const get = (name) => {
      const i = idx(name);
      return i >= 0 ? cols[i] : "";
    };
    claims.push({
      metric_name: get("metric") || get("metric_name"),
      value: parseNumber(get("value")),
      unit: get("unit") || "percentage",
      period: get("period") || null,
      country: get("country") || "Malaysia",
      product: get("product") || "All products",
      population: get("population") || null,
      calculation_type: get("calculation_type") || get("formula") || null,
      status: get("status") || "actual",
      speaker: get("speaker") || "CSV import",
      role: get("role") || "",
      raw_excerpt: line,
      source_hint: get("source") || "CSV",
      ambiguity: null,
    });
  }
  return { claims, ambiguous: [], evidence_notes: [], method: "csv" };
}

export const DEMO_TRANSCRIPTS = {
  retention: {
    id: "retention",
    title: "Q2 management meeting — retention",
    type: "transcript",
    body: `Maya Chen (Sales Lead): Q2 retention reached 71%, so our customer strategy is working.

Rajesh Kumar (Finance Lead): That cannot be right. The dashboard shows 62%.

Aisha Rahman (Country Manager): The last board presentation said 68%.

Daniel Okonkwo (Data Analyst): The board deck excludes customers who were not yet eligible to return, but the finance dashboard includes the whole original cohort. Sales used eligible-to-return customers for the 71% figure. The canonical registry still does not specify eligibility treatment.`,
  },
  npl: {
    id: "npl",
    title: "#risk-npl Slack thread",
    type: "slack",
    body: `Sofia Berg (Head of Risk): NPL decreased by 5% this month. Flow NPL is coming down.

Rajesh Kumar (Finance Lead): The finance mart still shows NPL at 3.2% stock. That is not a 5% decrease.

Priya Nair (CDO): We cannot take both numbers to the ALCO pack without a definition.`,
  },
  disbursement: {
    id: "disbursement",
    title: "Country review — disbursement",
    type: "transcript",
    body: `Aisha Rahman (Country Manager): We disbursed $12 million last quarter.

Kenji Watanabe (Product Lead, BOLT): Malaysia BOLT disbursement was $9.4 million. Please do not quote the regional number as Malaysia.

Rajesh Kumar (Finance Lead): Regional Orbit plus Pulse plus BOLT is $12.1 million. Malaysia BOLT only is $9.4 million.`,
  },
  active: {
    id: "active",
    title: "#growth Slack — active customers",
    type: "slack",
    body: `Maya Chen (Sales Lead): There are 4,200 active customers.

Daniel Okonkwo (Data Analyst): Product counts 3,850 as logged in last 30 days.

Kenji Watanabe (Product Lead, BOLT): Finance uses outstanding balance and gets 5,100.

Sofia Berg (Head of Risk): Risk only counts customers who transacted in the last 90 days: 2,900.`,
  },
};

export function listDemos() {
  return Object.values(DEMO_TRANSCRIPTS).map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    preview: d.body.split("\n")[0],
  }));
}

export async function extractWithOptionalLlm(content, sourceType, env = process.env) {
  const fallback = extractClaimsFromText(content, sourceType);
  const key = env.OPENAI_API_KEY;
  if (!key) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract structured metric claims from business conversation. Return JSON {claims:[{metric_name,value,unit,period,country,product,population,calculation_type,status,speaker,raw_excerpt,ambiguity}]}. Do not issue a verdict. Units: percentage, usd, count. status: actual, forecast, approved, completed.",
          },
          { role: "user", content: String(content).slice(0, 12000) },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const parsed = JSON.parse(json.choices?.[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.claims) || !parsed.claims.length) return fallback;
    return {
      claims: parsed.claims.map((c) => ({
        metric_name: c.metric_name,
        value: parseNumber(c.value),
        unit: c.unit || "percentage",
        period: c.period || null,
        country: c.country || "Malaysia",
        product: c.product || "All products",
        population: c.population || null,
        calculation_type: c.calculation_type || null,
        status: c.status || "actual",
        speaker: c.speaker || "Unknown",
        role: c.role || "",
        raw_excerpt: c.raw_excerpt || "",
        source_hint: null,
        ambiguity: c.ambiguity || null,
      })),
      ambiguous: fallback.ambiguous,
      evidence_notes: fallback.evidence_notes,
      explanation_turns: fallback.explanation_turns,
      method: "llm",
    };
  } catch {
    return fallback;
  }
}

export { unique };
