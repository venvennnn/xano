"""Backend adapter: local stand-in vs Xano HTTP client."""

import unittest
from unittest.mock import patch

from metric_court.backend import LocalBackend, XanoBackend, compose_dashboard, create_backend
from metric_court.engine import RETENTION_VERDICT, fresh_state


class LocalBackendTests(unittest.TestCase):
    def test_killer_demo_through_adapter(self):
        backend = LocalBackend(fresh_state())
        result = backend.analyze(demo="retention")
        self.assertEqual(result["cases_opened"][0]["case_number"], "MC-104")
        self.assertEqual(result["cases_opened"][0]["severity_score"], 84)
        verdict = backend.issue_verdict(result["cases_opened"][0]["id"], {**RETENTION_VERDICT, "issued_by": 1})
        self.assertEqual(verdict["definition"]["version"], 4)
        dash = backend.dashboard()
        open_numbers = {c["case_number"] for c in dash["open_cases"]}
        self.assertNotIn("MC-104", open_numbers)
        self.assertNotIn("MC-101", open_numbers)


class CreateBackendTests(unittest.TestCase):
    def test_default_is_local_stand_in(self):
        backend = create_backend(fresh_state())
        self.assertIsInstance(backend, LocalBackend)
        self.assertFalse(backend.live)

    def test_xano_env_selects_live_workspace(self):
        with patch.dict("os.environ", {"XANO_API_BASE": "https://example.xano.io/api:court"}, clear=False):
            backend = create_backend()
        self.assertIsInstance(backend, XanoBackend)
        self.assertTrue(backend.live)
        self.assertEqual(backend.name, "Xano")


class XanoClientTests(unittest.TestCase):
    def test_analyze_posts_to_xano_sources_endpoint(self):
        backend = XanoBackend("https://example.xano.io/api:court", "secret")
        with patch.object(backend, "_request", return_value={"claims": [{"value": 71}], "cases_opened": [{"case_number": "MC-104"}]}) as req:
            result = backend.analyze(demo="retention", content="x", source_type="transcript", title="demo")
        req.assert_called_once()
        method, path = req.call_args[0][:2]
        self.assertEqual(method, "POST")
        self.assertEqual(path, "sources/analyze")
        self.assertEqual(req.call_args[0][2]["demo"], "retention")
        self.assertEqual(result["cases_opened"][0]["case_number"], "MC-104")


class ComposeDashboardTests(unittest.TestCase):
    def test_composes_kpis_from_xano_case_list(self):
        dash = compose_dashboard(
            [
                {"id": 1, "case_number": "MC-104", "status": "open", "severity": "critical", "severity_score": 84, "metric_id": 1, "created_at": "2026-09-03T00:00:00Z"},
                {"id": 2, "case_number": "MC-101", "status": "closed", "severity": "high", "severity_score": 76, "metric_id": 1, "created_at": "2026-08-01T00:00:00Z"},
            ],
            [{"id": 1, "name": "Customer Retention", "canonical_id": "M-RET-001"}],
            [],
        )
        self.assertEqual(dash["kpis"]["open_cases"], 1)
        self.assertEqual(dash["kpis"]["critical_cases"], 1)
        self.assertEqual(dash["kpis"]["most_disputed_metric"], "Customer Retention")
        self.assertEqual(dash["open_cases"][0]["case_number"], "MC-104")


if __name__ == "__main__":
    unittest.main()
