import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { extractClaimsFromText } from "../src/extract.js";

process.env.COURT_DATA_FILE = path.join(os.tmpdir(), `metric-court-test-${Date.now()}.json`);

const { reset } = await import("../src/store.js");
const court = await import("../src/court.js");
const store = await import("../src/store.js");

describe("court loop: extract → case → verdict → precedent", () => {
  before(() => reset());

  it("opens MC-104 from the killer transcript and closes related MC-101 on verdict", () => {
    reset();
    const body = `Maya Chen (Sales Lead): Q2 retention reached 71%, so our customer strategy is working.
Rajesh Kumar (Finance Lead): That cannot be right. The dashboard shows 62%.
Aisha Rahman (Country Manager): The last board presentation said 68%.
Daniel Okonkwo (Data Analyst): The board deck excludes customers who were not yet eligible to return, but the finance dashboard includes the whole original cohort. Sales used eligible-to-return customers for the 71% figure.`;
    const extracted = extractClaimsFromText(body);
    assert.equal(extracted.claims.length, 3);

    const ids = [];
    for (const raw of extracted.claims) {
      const resolved = court.resolveMetric(raw.metric_name);
      const row = store.insert("claims", {
        metric_id: resolved.metric.id,
        matching_score: resolved.score,
        speaker: raw.speaker,
        value: raw.value,
        unit: raw.unit,
        period: raw.period,
        country: raw.country,
        product: raw.product,
        population: raw.population,
        calculation_type: raw.calculation_type,
        status: raw.status,
        raw_excerpt: raw.raw_excerpt,
        source_type: "transcript",
        source_title: "Management meeting",
        created_at: new Date().toISOString(),
        team_id: 2,
      });
      ids.push(row.id);
    }

    const { opened } = court.detectAndOpenCases(ids);
    assert.equal(opened.length, 1);
    assert.equal(opened[0].case_number, "MC-104");
    assert.ok(opened[0].drift_types.includes("definition"));
    assert.ok(opened[0].severity_score >= 60);

    const result = court.issueVerdict(opened[0].id, {
      outcome: "both_correct",
      statement: "For management reporting, retention will use customers eligible to return during the measurement window.",
      amend_definition: true,
      population: "Customers eligible to return",
      calculation_type: "Subsequent-quarter retention",
      formula: "customers_returning / customers_eligible_in_window",
      alias: "Eligible-customer retention",
      issued_by: 1,
    });

    assert.equal(result.case.status, "closed");
    assert.equal(result.definition.version, 4);
    assert.equal(result.alias.alias, "Eligible-customer retention");
    assert.ok(result.reassessed.some((c) => c.case_number === "MC-101"));
    const metric = store.getState().metrics.find((m) => m.canonical_id === "M-RET-001");
    assert.equal(metric.current_definition_id, result.definition.id);
  });
});
