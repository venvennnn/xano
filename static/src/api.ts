const API = import.meta.env.VITE_XANO_API_BASE || "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `API ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  dashboard: () => req<import("./types").Dashboard>("/dashboard"),
  radar: () => req<import("./types").Radar>("/dashboard/drift"),
  cases: (status?: string) => req<import("./types").CourtCase[]>(`/cases${status ? `?status=${status}` : ""}`),
  case: (id: string | number) => req<import("./types").CourtCase>(`/cases/${id}`),
  metrics: () => req<import("./types").Metric[]>("/metrics"),
  metric: (id: string | number) => req<import("./types").Metric>(`/metrics/${id}`),
  precedents: () => req<import("./types").Precedent[]>("/precedents"),
  users: () => req<import("./types").User[]>("/users"),
  demos: () => req<{ id: string; title: string; type: string; preview: string }[]>("/demos"),
  audit: () => req<{ id: number; action: string; detail: string; created_at: string }[]>("/audit"),
  analyze: (body: { type?: string; title?: string; content?: string; demo?: string }) =>
    req<import("./types").AnalyzeResult>("/sources/analyze", { method: "POST", body: JSON.stringify(body) }),
  verdict: (id: number, body: Record<string, unknown>) =>
    req(`/cases/${id}/verdict`, { method: "POST", body: JSON.stringify(body) }),
  evidence: (id: number, body: Record<string, unknown>) =>
    req(`/cases/${id}/evidence`, { method: "POST", body: JSON.stringify(body) }),
  appeal: (id: number, body: Record<string, unknown>) =>
    req(`/cases/${id}/appeal`, { method: "POST", body: JSON.stringify(body) }),
  reset: () => req("/demo/reset", { method: "POST", body: "{}" }),
};

export function subscribe(onEvent: (name: string, data: unknown) => void) {
  const src = new EventSource("/events");
  for (const name of [
    "hello",
    "case.opened",
    "verdict.issued",
    "dashboard.recalculated",
    "source.analyzed",
    "workspace.reset",
    "evidence.added",
  ]) {
    src.addEventListener(name, (ev) => {
      try {
        onEvent(name, JSON.parse((ev as MessageEvent).data));
      } catch {
        onEvent(name, null);
      }
    });
  }
  return () => src.close();
}
