import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSeed } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = process.env.COURT_DATA_FILE || path.join(DATA_DIR, "court.json");

let state = null;

export function getState() {
  if (!state) load();
  return state;
}

export function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      state = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return state;
    }
  } catch {
    // fall through to seed
  }
  state = buildSeed();
  persist();
  return state;
}

export function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export function reset() {
  state = buildSeed();
  persist();
  return state;
}

export function nextId(table) {
  const s = getState();
  s.sequences[table] = (s.sequences[table] || 0) + 1;
  return s.sequences[table];
}

export function insert(table, record) {
  const s = getState();
  if (!record.id) record.id = nextId(table);
  s[table].push(record);
  persist();
  return record;
}

export function update(table, id, patch) {
  const s = getState();
  const row = s[table].find((r) => r.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  persist();
  return row;
}

export function find(table, id) {
  return getState()[table].find((r) => r.id === Number(id) || r.id === id);
}

export function where(table, pred) {
  return getState()[table].filter(pred);
}

export function audit(actor_id, action, entity_type, entity_id, detail) {
  return insert("audit_events", {
    actor_id: actor_id || 0,
    action,
    entity_type,
    entity_id,
    detail,
    created_at: new Date().toISOString(),
  });
}
