import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreSeverity, valueDiscrepancy, recurrenceScore, priorityLevel } from "../src/severity.js";
import { matchingScore, suggestMetric } from "../src/match.js";
import { classifyPair, periodsCompatible, scopeOverlap } from "../src/drift.js";
import { extractClaimsFromText } from "../src/extract.js";
import { buildSeed } from "../src/seed.js";

describe("severity formula", () => {
  it("matches the spec example: 84 critical", () => {
    const result = scoreSeverity({
      definitionConflict: 1,
      valueDiscrepancy: 0.63,
      scopeIncompatibility: 0.8,
      audienceImpact: 1,
      recurrence: 0.75,
    });
    assert.equal(result.score, 84);
    assert.equal(result.level, "critical");
  });

  it("maps 9pp on a percentage metric to ~0.63", () => {
    assert.ok(Math.abs(valueDiscrepancy(71, 62, "percentage") - 0.63) < 0.01);
  });

  it("maps three disputes to recurrence 0.75", () => {
    assert.equal(recurrenceScore(2), 0.75);
  });

  it("bands priority levels", () => {
    assert.equal(priorityLevel(20), "informational");
    assert.equal(priorityLevel(45), "review");
    assert.equal(priorityLevel(70), "high");
    assert.equal(priorityLevel(80), "critical");
  });
});

describe("metric matching", () => {
  it("maps retention variants onto Customer Retention", () => {
    const seed = buildSeed();
    const metric = seed.metrics.find((m) => m.canonical_id === "M-RET-001");
    const aliases = seed.metric_aliases.filter((a) => a.metric_id === metric.id);
    for (const q of ["Retention", "customer retention", "repeat rate", "returning-customer rate", "subsequent-quarter retention"]) {
      assert.ok(matchingScore(q, metric, aliases) >= 0.86, q);
    }
  });

  it("does not map NPL onto retention", () => {
    const seed = buildSeed();
    const metric = seed.metrics.find((m) => m.canonical_id === "M-RET-001");
    assert.ok(matchingScore("NPL ratio", metric, []) < 0.45);
  });
});

describe("claim extraction", () => {
  it("extracts 71, 62 and 68 from the killer transcript", () => {
    const body = `Maya Chen (Sales Lead): Q2 retention reached 71%, so our customer strategy is working.
Rajesh Kumar (Finance Lead): That cannot be right. The dashboard shows 62%.
Aisha Rahman (Country Manager): The last board presentation said 68%.
Daniel Okonkwo (Data Analyst): The board deck excludes customers who were not yet eligible to return, but the finance dashboard includes the whole original cohort.`;
    const { claims } = extractClaimsFromText(body);
    const values = claims.map((c) => c.value).sort((a, b) => b - a);
    assert.deepEqual(values, [71, 68, 62]);
    assert.ok(claims.every((c) => c.metric_name === "Customer Retention"));
    assert.ok(claims.every((c) => c.period === "Q2 2026"));
  });
});

describe("drift classification", () => {
  it("flags definition + value drift for eligible vs complete cohort", () => {
    const a = {
      value: 71,
      unit: "percentage",
      period: "Q2 2026",
      country: "Malaysia",
      product: "All products",
      population: "Customers eligible to return",
      calculation_type: "Subsequent-quarter retention",
      status: "actual",
      source_type: "transcript",
      source_title: "Management meeting",
    };
    const b = {
      value: 62,
      unit: "percentage",
      period: "Q2 2026",
      country: "Malaysia",
      product: "All products",
      population: "Complete original cohort",
      calculation_type: "Subsequent-quarter retention",
      status: "actual",
      source_type: "dashboard",
      source_title: "Finance dashboard",
    };
    const result = classifyPair(a, b);
    assert.ok(result.types.includes("definition"));
    assert.ok(result.types.includes("value"));
    assert.ok(result.types.includes("source"));
    assert.equal(result.period.identical, true);
  });

  it("flags scope drift for regional vs Malaysia BOLT", () => {
    const result = scopeOverlap(
      { country: "Regional", product: "All products" },
      { country: "Malaysia", product: "BOLT" }
    );
    assert.equal(result.compatible, false);
    assert.ok(result.diffs.length >= 2);
  });

  it("flags time drift for month-end vs today", () => {
    const p = periodsCompatible("month-end", "today");
    assert.equal(p.compatible, false);
  });
});

describe("seed integrity", () => {
  it("has four Active Customer definitions and an open MC-102", () => {
    const seed = buildSeed();
    const active = seed.metrics.find((m) => m.canonical_id === "M-ACT-001");
    const defs = seed.metric_definitions.filter((d) => d.metric_id === active.id);
    assert.ok(defs.length >= 4);
    assert.ok(seed.cases.some((c) => c.case_number === "MC-102" && c.status === "open"));
    assert.equal(seed.meta.next_case_seq, 104);
  });
});
