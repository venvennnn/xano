"""Killer-demo checks for the Streamlit court engine."""

import unittest

from metric_court.engine import (
    DEMOS,
    RETENTION_VERDICT,
    analyze,
    extract_claims,
    fresh_state,
    issue_verdict,
    score_severity,
    value_discrepancy,
)


class SeverityTests(unittest.TestCase):
    def test_spec_example_is_84_critical(self):
        result = score_severity(1, 0.63, 0.8, 1, 0.75)
        self.assertEqual(result["score"], 84)
        self.assertEqual(result["level"], "critical")

    def test_nine_points_is_about_0_63(self):
        self.assertAlmostEqual(value_discrepancy(71, 62, "percentage"), 0.63, places=2)


class ExtractTests(unittest.TestCase):
    def test_retention_transcript_extracts_71_62_68(self):
        extracted = extract_claims(DEMOS["retention"]["body"])
        values = sorted((c["value"] for c in extracted["claims"]), reverse=True)
        self.assertEqual(values, [71, 68, 62])
        self.assertTrue(all(c["metric_name"] == "Customer Retention" for c in extracted["claims"]))
        self.assertTrue(all(c["period"] == "Q2 2026" for c in extracted["claims"]))


class KillerDemoTests(unittest.TestCase):
    def test_convene_opens_mc104_critical(self):
        state = fresh_state()
        result = analyze(state, demo="retention")
        values = sorted((c["value"] for c in result["claims"]), reverse=True)
        self.assertEqual(values, [71, 68, 62])
        self.assertEqual(len(result["cases_opened"]), 1)
        case = result["cases_opened"][0]
        self.assertEqual(case["case_number"], "MC-104")
        self.assertEqual(case["severity"], "critical")
        self.assertEqual(case["severity_score"], 84)
        self.assertIn("definition", case.get("drift_types") or [])

    def test_verdict_writes_v4_alias_and_closes_mc101(self):
        state = fresh_state()
        opened = analyze(state, demo="retention")["cases_opened"][0]
        result = issue_verdict(state, opened["id"], {**RETENTION_VERDICT, "issued_by": 1})
        self.assertEqual(result["definition"]["version"], 4)
        self.assertEqual(result["alias"]["alias"], "Eligible-customer retention")
        closed = {c["case_number"] for c in result["reassessed"]}
        self.assertIn("MC-101", closed)
        retention = next(m for m in state["metrics"] if m["canonical_id"] == "M-RET-001")
        self.assertEqual(retention["current_definition_id"], result["definition"]["id"])


if __name__ == "__main__":
    unittest.main()
