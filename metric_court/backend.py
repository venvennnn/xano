"""Court backend: live Xano workspace, or a local stand-in of the same API contract.

Streamlit is only the courtroom UI. Xano operates the court — registry, matching,
severity, case open on claim insert, verdict side-effects, precedent, audit.
Set XANO_API_BASE (env or Streamlit secrets) to talk to a workspace.
Without it, the Python engine runs the same functions locally so the demo still works.
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import urljoin

from metric_court.engine import (
    analyze as local_analyze,
    assemble_case as local_assemble,
    dashboard as local_dashboard,
    fresh_state,
    issue_verdict as local_verdict,
)

DEFAULT_COMPANY = "Aether Credit"


def _secret(name: str, default: str = "") -> str:
    value = os.environ.get(name, default) or default
    try:
        import streamlit as st

        secrets = getattr(st, "secrets", None)
        if secrets is not None and name in secrets:
            return str(secrets[name] or value)
    except Exception:
        pass
    return value


def xano_api_base() -> str:
    return _secret("XANO_API_BASE", "").strip().rstrip("/")


def xano_api_key() -> str:
    return _secret("XANO_API_KEY", "").strip()


def xano_configured() -> bool:
    return bool(xano_api_base())


class LocalBackend:
    """In-process stand-in of the Xano court (same functions as xano/functions)."""

    name = "Xano stand-in (local)"
    detail = "Same Xano functions, running here. Set XANO_API_BASE to use your workspace."
    live = False

    def __init__(self, store: dict[str, Any]):
        self.store = store

    def dashboard(self) -> dict[str, Any]:
        return local_dashboard(self.store)

    def analyze(self, *, content=None, source_type="transcript", title=None, demo=None) -> dict[str, Any]:
        return local_analyze(self.store, content=content, source_type=source_type, title=title, demo=demo)

    def assemble_case(self, case_id) -> dict[str, Any] | None:
        return local_assemble(self.store, case_id)

    def issue_verdict(self, case_id, payload: dict[str, Any]) -> dict[str, Any]:
        return local_verdict(self.store, case_id, payload)

    def reset(self) -> dict[str, Any]:
        self.store.clear()
        self.store.update(fresh_state())
        return {"ok": True, "dashboard": local_dashboard(self.store)}


class XanoBackend:
    """HTTP client for the Xano API group (or court-engine on the same routes)."""

    name = "Xano"
    live = True

    def __init__(self, base: str, api_key: str = ""):
        self.base = base.rstrip("/")
        self.api_key = api_key
        host = base.replace("https://", "").replace("http://", "").split("/")[0]
        self.detail = f"Workspace {host}"

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _request(self, method: str, path: str, json_body=None):
        import requests

        url = self.base if path == "" else urljoin(self.base + "/", path.lstrip("/"))
        try:
            res = requests.request(method, url, json=json_body, headers=self._headers(), timeout=45)
        except requests.RequestException as exc:
            raise RuntimeError(f"Xano request failed: {exc}") from exc
        if not res.ok:
            try:
                body = res.json()
                message = body.get("message") or body.get("error") or res.text
            except Exception:
                message = res.text or f"HTTP {res.status_code}"
            raise RuntimeError(f"Xano {method} {path} → {res.status_code}: {message}")
        if not res.content:
            return {}
        return res.json()

    def _get(self, path: str):
        return self._request("GET", path)

    def _post(self, path: str, body: dict[str, Any] | None = None):
        return self._request("POST", path, body or {})

    def dashboard(self) -> dict[str, Any]:
        raw: dict[str, Any] = {}
        for path in ("dashboard", "dashboard/drift"):
            try:
                payload = self._get(path)
                if isinstance(payload, dict):
                    raw = payload
                    break
            except RuntimeError:
                continue
        cases = raw.get("cases") if isinstance(raw.get("cases"), list) else None
        metrics = raw.get("metrics") if isinstance(raw.get("metrics"), list) else None
        precedents = raw.get("precedents") if isinstance(raw.get("precedents"), list) else None
        if cases is None:
            try:
                cases = self._get("cases") or []
            except RuntimeError:
                cases = []
        if metrics is None:
            try:
                metrics = self._get("metrics") or []
            except RuntimeError:
                metrics = []
        if precedents is None:
            try:
                precedents = self._get("precedents") or []
            except RuntimeError:
                precedents = []
        open_rows = raw.get("open_cases")
        if (
            raw.get("kpis")
            and raw.get("headline")
            and isinstance(open_rows, list)
            and (not open_rows or open_rows[0].get("metric_name") or open_rows[0].get("case_number"))
        ):
            raw.setdefault("company", DEFAULT_COMPANY)
            raw.setdefault("closed_cases", [])
            raw.setdefault("registry", [])
            raw.setdefault("precedents", precedents)
            return raw
        return compose_dashboard(cases or [], metrics or [], precedents or [], raw)

    def analyze(self, *, content=None, source_type="transcript", title=None, demo=None) -> dict[str, Any]:
        body: dict[str, Any] = {"type": source_type, "title": title, "content": content}
        if demo:
            body["demo"] = demo
        result = self._post("sources/analyze", body)
        if not isinstance(result, dict):
            return {"source": result, "claims": [], "cases_opened": []}
        if "cases_opened" not in result:
            cases = []
            try:
                cases = self._get("cases") or []
            except RuntimeError:
                pass
            result["cases_opened"] = [
                c for c in cases if isinstance(c, dict) and c.get("status") in ("open", "hearing")
            ][:3]
        result.setdefault("claims", [])
        return result

    def assemble_case(self, case_id) -> dict[str, Any] | None:
        try:
            row = self._get(f"cases/{case_id}")
        except RuntimeError:
            return None
        return row if isinstance(row, dict) else None

    def issue_verdict(self, case_id, payload: dict[str, Any]) -> dict[str, Any]:
        return self._post(f"cases/{case_id}/verdict", payload)

    def reset(self) -> dict[str, Any]:
        try:
            return self._post("demo/reset", {})
        except RuntimeError as exc:
            raise RuntimeError(
                "This Xano workspace has no demo reset endpoint. Reset the seed in the Xano dashboard, or run without XANO_API_BASE."
            ) from exc


def compose_dashboard(cases, metrics, precedents, drift=None) -> dict[str, Any]:
    drift = drift or {}
    rows = [c if isinstance(c, dict) else {} for c in cases]
    open_cases = [c for c in rows if c.get("status") in ("open", "hearing", "appealed")]
    closed = [c for c in rows if c.get("status") == "closed"]
    critical = [c for c in open_cases if c.get("severity") == "critical"]

    def summarize(c):
        metric = c.get("metric") or {}
        owner = c.get("owner") or {}
        claims = c.get("claims") or []
        values = [x.get("value") for x in claims if isinstance(x, dict) and x.get("value") is not None]
        if not values:
            values = c.get("values") or []
        return {
            **c,
            "metric_name": c.get("metric_name") or metric.get("name"),
            "owner_name": c.get("owner_name") or owner.get("name"),
            "values": values,
        }

    by_metric: dict[Any, int] = {}
    for c in rows:
        mid = c.get("metric_id") or (c.get("metric") or {}).get("id")
        if mid is not None:
            by_metric[mid] = by_metric.get(mid, 0) + 1
    metric_index = {m.get("id"): m for m in metrics if isinstance(m, dict)}
    most = sorted(
        ({"metric": metric_index.get(mid) or {"name": f"metric {mid}"}, "count": n} for mid, n in by_metric.items()),
        key=lambda x: -x["count"],
    )
    n_active_defs = 0
    for m in metrics:
        if isinstance(m, dict) and m.get("canonical_id") == "M-ACT-001":
            defs = m.get("definitions") or []
            n_active_defs = len(defs) or int(m.get("definition_count") or 0)
    headline = drift.get("headline") or (
        f"Your company currently has {n_active_defs} definitions of “Active Customer.”" if n_active_defs >= 3 else "The docket is open."
    )
    return {
        "headline": headline,
        "company": drift.get("company") or DEFAULT_COMPANY,
        "kpis": {
            "open_cases": len(open_cases),
            "critical_cases": len(critical),
            "avg_resolution_days": drift.get("avg_resolution_days") or 9.1,
            "most_disputed_metric": ((most[0]["metric"] or {}).get("name") if most else "—"),
        },
        "open_cases": sorted([summarize(c) for c in open_cases], key=lambda c: -(c.get("severity_score") or 0)),
        "closed_cases": [summarize(c) for c in closed],
        "most_disputed": most[:6],
        "definition_conflicts_by_team": drift.get("definition_conflicts_by_team") or [],
        "recurring_drift": drift.get("recurring_drift") or {},
        "value_drift_series": drift.get("value_drift_series")
        or [
            {
                "date": (c.get("created_at") or "")[:10],
                "case_number": c.get("case_number"),
                "score": c.get("severity_score") or 0,
                "metric": (c.get("metric") or {}).get("name") or c.get("metric_name"),
            }
            for c in rows
            if c.get("created_at")
        ],
        "registry": [
            {
                **m,
                "owner": m.get("owner") if isinstance(m.get("owner"), dict) else {"name": m.get("owner")},
                "current_definition": m.get("current_definition") or {},
                "aliases": m.get("aliases") or [],
                "cases": m.get("cases") if isinstance(m.get("cases"), list) else [],
            }
            for m in metrics
            if isinstance(m, dict)
        ],
        "precedents": precedents if isinstance(precedents, list) else [],
    }


def create_backend(store: dict[str, Any] | None = None):
    base = xano_api_base()
    if base:
        return XanoBackend(base, xano_api_key())
    if store is None:
        store = fresh_state()
    return LocalBackend(store)
