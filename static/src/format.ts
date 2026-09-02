export function formatValue(value: number | null | undefined, unit?: string) {
  if (value == null) return "—";
  if (unit === "percentage" || unit === "pp") {
    const n = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
    return `${n}%`;
  }
  if (unit === "usd") {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value).toLocaleString()}`;
    return `$${value}`;
  }
  return Number(value).toLocaleString();
}

export function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function driftLabel(type: string) {
  return `${type} drift`;
}

export const VERDICT_OPTIONS = [
  { id: "claim_a_authoritative", label: "Claim A is authoritative" },
  { id: "claim_b_authoritative", label: "Claim B is authoritative" },
  { id: "both_correct", label: "Both are correct under different definitions" },
  { id: "neither_supported", label: "Neither claim is supported" },
  { id: "canonical_amended", label: "Canonical definition must be amended" },
  { id: "more_evidence", label: "More evidence is required" },
] as const;

export const RETENTION_VERDICT = {
  outcome: "both_correct",
  statement:
    "Definition mismatch. Neither claim is inherently incorrect. For management reporting, retention will use customers eligible to return during the measurement window.",
  population: "Customers eligible to return",
  calculation_type: "Subsequent-quarter retention",
  formula: "customers_returning / customers_eligible_in_window",
  definition_notes:
    "Exclude customers whose next eligibility date falls after the measurement window. Complete-cohort retention remains a diagnostic.",
  alias: "Eligible-customer retention",
  precedent_title: "Management retention excludes ineligible-to-return customers",
  precedent_rule:
    "When reporting subsequent-quarter retention, exclude customers whose next eligibility date falls after the measurement window.",
  amend_definition: true,
  approved_source: "Customer mart · retention_eligible",
  issued_by: 1,
};
