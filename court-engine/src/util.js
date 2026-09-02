/** Shared string helpers used by matching, extraction, and drift. */

export function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(value = "") {
  const stop = new Set([
    "the", "a", "an", "of", "for", "and", "or", "to", "in", "on", "our",
    "was", "is", "are", "by", "with", "from", "that", "this", "last",
  ]);
  return normalizeText(value)
    .split(" ")
    .filter((t) => t && !stop.has(t));
}

export function jaccard(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function clamp(n, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function relativeDifference(a, b) {
  if (a == null || b == null) return 0;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / denom;
}

export function nowIso() {
  return new Date().toISOString();
}

export function daysBetween(a, b) {
  const ms = Math.abs(new Date(a) - new Date(b));
  return ms / (1000 * 60 * 60 * 24);
}

export function titleCase(value = "") {
  return String(value)
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function unique(list) {
  return [...new Set(list)];
}

export function slug(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}
