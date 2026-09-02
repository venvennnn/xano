export type Severity = "informational" | "review" | "high" | "critical";
export type CaseStatus = "open" | "hearing" | "closed" | "appealed";
export type DriftType = "value" | "definition" | "time" | "scope" | "status" | "source";

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  title: string;
  team_id: number;
};

export type Metric = {
  id: number;
  canonical_id: string;
  name: string;
  owner_id: number;
  owner?: User;
  approved_source: string;
  health_status: string;
  unit: string;
  current_definition_id: number | null;
  current_definition?: Definition;
  aliases?: Alias[];
  cases?: number | CourtCase[];
  open_cases?: number;
  definitions?: Definition[];
  precedents?: Precedent[];
};

export type Definition = {
  id: number;
  metric_id: number;
  version: number;
  formula: string;
  population: string;
  calculation_type: string;
  unit: string;
  valid_from: string;
  valid_to: string | null;
  notes: string;
};

export type Alias = {
  id: number;
  metric_id: number;
  alias: string;
  approved: boolean;
  source: string;
};

export type Claim = {
  id: number;
  slot?: string;
  metric_id: number;
  metric_name?: string;
  matching_score?: number;
  speaker: string;
  role?: string;
  value: number;
  unit: string;
  period: string;
  country: string;
  product: string;
  population: string | null;
  calculation_type: string | null;
  status: string;
  raw_excerpt: string;
  source_type?: string;
  source_title?: string;
  ambiguity?: string | null;
  match?: { score: number; metric: Metric | null };
};

export type CourtCase = {
  id: number;
  case_number: string;
  title: string;
  metric_id: number;
  metric_name?: string;
  metric?: Metric;
  status: CaseStatus;
  severity: Severity;
  severity_score: number;
  severity_components?: Record<string, number>;
  drift_types: DriftType[];
  suggested_explanation: string;
  owner_id: number;
  owner?: User;
  owner_name?: string;
  deadline: string;
  created_at: string;
  closed_at: string | null;
  claims?: Claim[];
  evidence?: Evidence[];
  verdicts?: Verdict[];
  precedents?: Precedent[];
  current_definition?: Definition;
  definitions?: Definition[];
  related_cases?: CourtCase[];
  detected_differences?: string[];
  pairwise?: unknown[];
  values?: number[];
};

export type Evidence = {
  id: number;
  case_id: number;
  type: string;
  title: string;
  content: string;
  submitted_by: number;
  created_at: string;
};

export type Verdict = {
  id: number;
  case_id: number;
  outcome: string;
  statement: string;
  definition_version_created: number | null;
  issued_by: number;
  issued_at: string;
};

export type Precedent = {
  id: number;
  case_id: number;
  metric_id: number;
  title: string;
  rule: string;
  applies_to_drift: DriftType[];
  created_at: string;
  metric?: Metric;
  case?: CourtCase;
};

export type Dashboard = {
  headline: string;
  company: string;
  kpis: {
    open_cases: number;
    critical_cases: number;
    avg_resolution_days: number;
    most_disputed_metric: string;
    overdue_hearings: number;
  };
  open_cases: CourtCase[];
  closed_cases: CourtCase[];
  most_disputed: { metric: Metric; count: number }[];
  definition_conflicts_by_team: { team: string; count: number }[];
  recurring_drift: Record<string, number>;
  value_drift_series: { date: string; case_number: string; metric: string; score: number; types: string[] }[];
  registry_health: Metric[];
};

export type AnalyzeResult = {
  source: { id: number; title: string; type: string };
  claims: Claim[];
  ambiguous: { speaker: string; text: string; reason: string }[];
  method: string;
  cases_opened: CourtCase[];
};

export type Radar = {
  headline: string;
  definition_drift_by_team: { team: string; count: number }[];
  value_drift_over_time: Dashboard["value_drift_series"];
  most_misunderstood: { metric: Metric; count: number }[];
  reopened: CourtCase[];
  avg_time_to_verdict_days: number;
  recurring_drift: Record<string, number>;
  open_cases: number;
  critical_cases: number;
};
