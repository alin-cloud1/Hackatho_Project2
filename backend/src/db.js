import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

// SQLite (built into Node ≥ 22.5 as node:sqlite) — zero-install, file-based.
// A thin shim keeps the pg-style call sites unchanged: `$1` placeholders,
// boolean params, and a `{ rows }` return shape.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = config.db.file || path.join(__dirname, "..", "data", "anti_kuddus.db");

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new DatabaseSync(dbFile);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

function convertPlaceholders(sql) {
  // $1, $2, ... -> ?  (SQLite uses positional ?).
  return sql.replace(/\$(\d+)/g, "?");
}

function normalizeParams(params = []) {
  return params.map((p) => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p === undefined) return null;
    return p;
  });
}

const RETURNS_ROWS = /^\s*(select|with)\b|returning\b/i;

/** pg-compatible query helper: returns { rows }. */
export function query(text, params = []) {
  const sql = convertPlaceholders(text);
  const stmt = db.prepare(sql);
  const args = normalizeParams(params);
  if (RETURNS_ROWS.test(text)) {
    return { rows: stmt.all(...args) };
  }
  const info = stmt.run(...args);
  return { rows: [], rowCount: info.changes };
}

/** Run raw multi-statement SQL (schema files). */
export function exec(sql) {
  db.exec(sql);
}

export async function assertDbConnection() {
  try {
    db.prepare("SELECT 1").get();
  } catch (err) {
    throw new Error(`SQLite database at ${dbFile} is not usable — ${err.message}`);
  }
}
